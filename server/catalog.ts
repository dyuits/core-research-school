import express from "express";
import { corePrograms } from "../client/src/data/corePrograms";
import multer from "multer";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { z } from "zod";
import {
  definitions,
  recordCategories,
  type Entry,
  type Kind,
} from "../shared/catalog";
import { MAX_FILE_SIZE, validateFile } from "./files";

export function createCatalog(options: {
  directory: string;
  passwordHash: string;
  secure?: boolean;
}) {
  mkdirSync(path.join(options.directory, "files"), { recursive: true });
  const db = new DatabaseSync(path.join(options.directory, "catalog.sqlite"));
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS entries(id TEXT PRIMARY KEY, kind TEXT NOT NULL, json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS attachments(id TEXT PRIMARY KEY, entryId TEXT NOT NULL REFERENCES entries(id) ON DELETE RESTRICT, json TEXT NOT NULL);`);
  db.exec(
    "CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY, value TEXT NOT NULL)"
  );
  if (!db.prepare("SELECT key FROM metadata WHERE key='legacy-import'").get()) {
    db.exec("BEGIN");
    try {
      for (const p of corePrograms) {
        const row: Entry = {
          id: p.id,
          kind: "programs",
          title: p.title,
          status: "published",
          programId: null,
          sessionId: null,
          position: p.sequence,
          anonymized: false,
          updatedAt: new Date().toISOString(),
          data: {
            title: p.title,
            subject: p.subject,
            description: p.subtitle,
            goals: p.goal,
            tools: p.tools.join(" · "),
            activities: p.steps.map(s => `${s.label}: ${s.text}`).join("\n"),
            source: `기존 CORE 아카이브 client/src/data/corePrograms.ts · 원문 차시 표기: ${p.sessions}`,
          },
        };
        db.prepare("INSERT OR IGNORE INTO entries VALUES(?,?,?)").run(
          row.id,
          row.kind,
          JSON.stringify(row)
        );
      }
      db.prepare("INSERT INTO metadata VALUES(?,?)").run("legacy-import", "1");
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
  const app = express.Router();
  const sessions = new Map<string, number>();
  const attempts = new Map<string, { count: number; until: number }>();
  const get = (id: string): Entry | undefined => {
    const r = db.prepare("SELECT json FROM entries WHERE id=?").get(id);
    return r ? JSON.parse(String(r.json)) : undefined;
  };
  const all = (): Entry[] =>
    db
      .prepare("SELECT json FROM entries")
      .all()
      .map(r => JSON.parse(String(r.json)));
  const admin = (req: express.Request) => {
    const token = /(?:^|;\s*)school_session=([a-f0-9]+)/.exec(
      req.headers.cookie ?? ""
    )?.[1];
    return token && (sessions.get(token) ?? 0) > Date.now();
  };
  const visible = (e: Entry, seen = new Set<string>()): boolean => {
    if (e.status !== "published" || seen.has(e.id)) return false;
    seen.add(e.id);
    return [e.programId, e.sessionId].filter(Boolean).every(id => {
      const parent = get(id!);
      return parent ? visible(parent, new Set(seen)) : false;
    });
  };
  app.use(express.json({ limit: "300kb" }));
  app.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    res.set("X-Content-Type-Options", "nosniff");
    next();
  });
  app.get("/auth", (req, res) => res.json({ admin: !!admin(req) }));
  app.post("/login", (req, res) => {
    if (!options.passwordHash)
      return res
        .status(503)
        .json({ error: "서버 관리자 암호가 설정되지 않았습니다." });
    const key = req.ip ?? "unknown";
    const now = Date.now();
    for (const [ip, a] of attempts) if (a.until < now) attempts.delete(ip);
    const a = attempts.get(key) ?? { count: 0, until: now + 15 * 60 * 1000 };
    if (a.count >= 8)
      return res.status(429).json({ error: "15분 후 다시 시도하세요." });
    a.count++;
    attempts.set(key, a);
    const [salt, expected] = options.passwordHash.split(":");
    const password = req.body?.password;
    if (
      !salt ||
      !expected ||
      typeof password !== "string" ||
      password.length > 256
    )
      return res.status(401).json({ error: "로그인 실패" });
    const actual = scryptSync(password, salt, 64);
    const target = Buffer.from(expected, "hex");
    if (target.length !== actual.length || !timingSafeEqual(actual, target))
      return res.status(401).json({ error: "로그인 실패" });
    attempts.delete(key);
    for (const [t, expiry] of sessions) if (expiry < now) sessions.delete(t);
    const token = randomBytes(32).toString("hex");
    sessions.set(token, now + 8 * 3600000);
    res.cookie("school_session", token, {
      httpOnly: true,
      secure: options.secure ?? true,
      sameSite: "strict",
      maxAge: 8 * 3600000,
      path: "/api",
    });
    return res.json({ admin: true });
  });
  app.use((req, res, next) => {
    if (["GET", "HEAD"].includes(req.method)) return next();
    // Browser cross-origin form posts cannot carry this JSON/custom header combination.
    if (req.get("X-School-Request") !== "1")
      return res.status(403).json({ error: "요청 검증 실패" });
    if (!admin(req))
      return res.status(401).json({ error: "관리자 로그인이 필요합니다." });
    next();
  });
  app.post("/logout", (req, res) => {
    const token = /(?:^|;\s*)school_session=([a-f0-9]+)/.exec(
      req.headers.cookie ?? ""
    )?.[1];
    if (token) sessions.delete(token);
    res.clearCookie("school_session", { path: "/api" });
    res.json({ ok: true });
  });
  app.get("/entries", (req, res) => {
    let rows = all().filter(e => admin(req) || visible(e));
    if (req.query.kind) rows = rows.filter(e => e.kind === req.query.kind);
    if (req.query.programId)
      rows = rows.filter(e => e.programId === req.query.programId);
    if (req.query.sessionId)
      rows = rows.filter(e => e.sessionId === req.query.sessionId);
    const q = String(req.query.q ?? "")
      .toLowerCase()
      .slice(0, 200);
    if (q)
      rows = rows.filter(e => JSON.stringify(e.data).toLowerCase().includes(q));
    if (req.query.category)
      rows = rows.filter(e => e.data.category === req.query.category);
    rows.sort(
      (a, b) => a.position - b.position || a.title.localeCompare(b.title, "ko")
    );
    const total = rows.length;
    const offset = Math.max(0, Number(req.query.offset) || 0);
    res.json({ items: rows.slice(offset, offset + 50), total });
  });
  app.get("/entries/:id", (req, res) => {
    const e = get(req.params.id);
    if (!e || (!admin(req) && !visible(e))) return res.sendStatus(404);
    res.json(e);
  });
  const schema = z
    .object({
      kind: z.enum(Object.keys(definitions) as [Kind, ...Kind[]]),
      status: z.enum(["draft", "private", "published"]),
      programId: z.string().nullable(),
      sessionId: z.string().nullable(),
      position: z.number().int().min(0).max(100000),
      anonymized: z.boolean(),
      data: z.record(z.string(), z.string().max(20000)),
    })
    .strict();
  app.put("/entries/:id", (req, res) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: "입력 형식이 올바르지 않습니다." });
    const input = parsed.data;
    const old = get(req.params.id);
    if (
      !/^[a-zA-Z0-9-]{1,100}$/.test(req.params.id) ||
      (old && old.kind !== input.kind)
    )
      return res.status(400).json({ error: "자료 식별자를 확인하세요." });
    if (
      Object.keys(input.data).some(
        k => !(k in definitions[input.kind].fields)
      ) ||
      !input.data.title?.trim()
    )
      return res
        .status(400)
        .json({ error: "제목 또는 입력 항목을 확인하세요." });
    if (
      old?.kind === "sessions" &&
      old.programId !== input.programId &&
      all().some(e => e.sessionId === old.id)
    ) {
      return res
        .status(409)
        .json({
          error:
            "연결된 평가·기재 예시를 먼저 이동한 뒤 차시의 프로그램을 변경하세요.",
        });
    }
    const p = input.programId ? get(input.programId) : undefined;
    const s = input.sessionId ? get(input.sessionId) : undefined;
    if (
      (input.programId && p?.kind !== "programs") ||
      (input.sessionId &&
        (s?.kind !== "sessions" || s.programId !== input.programId)) ||
      (input.kind === "sessions" && (!p || input.sessionId)) ||
      (["programs", "introduction"].includes(input.kind) &&
        (input.programId || input.sessionId))
    )
      return res
        .status(400)
        .json({ error: "프로그램·차시 연결이 올바르지 않습니다." });
    if (
      input.kind === "records" &&
      (!p || !s || !recordCategories.includes(input.data.category))
    )
      return res.status(400).json({
        error: "기재 예시는 프로그램·차시 및 기록 영역을 지정하세요.",
      });
    if (
      ["records", "assessments"].includes(input.kind) &&
      input.status === "published" &&
      !input.anonymized
    )
      return res
        .status(400)
        .json({ error: "공개 전 비식별화 확인이 필요합니다." });
    const row = {
      ...input,
      id: req.params.id,
      title: input.data.title,
      updatedAt: new Date().toISOString(),
    };
    db.prepare(
      "INSERT INTO entries VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json"
    ).run(row.id, row.kind, JSON.stringify(row));
    res.json(row);
  });
  app.delete("/entries/:id", (req, res) => {
    if (
      all().some(
        e => e.programId === req.params.id || e.sessionId === req.params.id
      ) ||
      db
        .prepare("SELECT id FROM attachments WHERE entryId=?")
        .get(req.params.id)
    )
      return res.status(409).json({
        error: "연결된 차시·자료·첨부파일을 먼저 이동하거나 삭제하세요.",
      });
    db.prepare("DELETE FROM entries WHERE id=?").run(req.params.id);
    res.json({ ok: true });
  });
  app.get("/entries/:id/attachments", (req, res) => {
    const e = get(req.params.id);
    if (!e || (!admin(req) && !visible(e))) return res.sendStatus(404);
    res.json(
      db
        .prepare("SELECT json FROM attachments WHERE entryId=? ORDER BY rowid")
        .all(e.id)
        .map(r => JSON.parse(String(r.json)))
    );
  });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE, files: 1, fields: 2, fieldSize: 200 },
  });
  app.post(
    "/entries/:id/attachments",
    upload.single("file"),
    async (req, res, next) => {
      try {
        const target = get(req.params.id);
        if (!target) return res.sendStatus(404);
        if (
          ["records", "assessments"].includes(target.kind) &&
          target.status === "published" &&
          req.body.anonymized !== "true"
        )
          return res
            .status(400)
            .json({ error: "공개 파일의 비식별화 여부를 확인하세요." });
        if (!req.file)
          return res.status(400).json({ error: "파일이 필요합니다." });
        const { originalname, buffer } = req.file;
        const name = Buffer.from(originalname, "latin1").toString("utf8");
        const validated = await validateFile(name, buffer);
        const id = randomUUID();
        const row = {
          id,
          entryId: req.params.id,
          name,
          category: String(req.body.category ?? "기타 참고자료").slice(0, 100),
          size: buffer.length,
          uploadedAt: new Date().toISOString(),
          ...validated,
        };
        writeFileSync(path.join(options.directory, "files", id), buffer, {
          flag: "wx",
        });
        try {
          db.prepare("INSERT INTO attachments VALUES(?,?,?)").run(
            id,
            row.entryId,
            JSON.stringify(row)
          );
        } catch (e) {
          unlinkSync(path.join(options.directory, "files", id));
          throw e;
        }
        res.status(201).json(row);
      } catch (e) {
        next(e);
      }
    }
  );
  app.get("/attachments/:id/download", (req, res) => {
    const r = db
      .prepare("SELECT json FROM attachments WHERE id=?")
      .get(req.params.id);
    if (!r) return res.sendStatus(404);
    const a = JSON.parse(String(r.json));
    const e = get(a.entryId);
    if (!e || (!admin(req) && !visible(e))) return res.sendStatus(404);
    res.set("Content-Type", "application/octet-stream");
    res.set(
      "Content-Disposition",
      `attachment; filename="download.${a.format}"; filename*=UTF-8''${encodeURIComponent(a.name)}`
    );
    res.sendFile(path.resolve(options.directory, "files", a.id), {
      cacheControl: false,
      lastModified: false,
    });
  });
  app.delete("/attachments/:id", (req, res) => {
    const r = db
      .prepare("SELECT id FROM attachments WHERE id=?")
      .get(req.params.id);
    if (!r) return res.sendStatus(404);
    // Each immutable stored object belongs to exactly one attachment, with no shared path.
    db.prepare("DELETE FROM attachments WHERE id=?").run(req.params.id);
    try {
      unlinkSync(path.join(options.directory, "files", String(r.id)));
    } catch {
      /* orphan cleanup can be retried by operator */
    }
    res.json({ ok: true });
  });
  app.use((_req, res) =>
    res.status(404).json({ error: "API 경로를 찾을 수 없습니다." })
  );
  const errors: express.ErrorRequestHandler = (err, _req, res, _next) => {
    res
      .status(400)
      .json({ error: err instanceof Error ? err.message : "요청 처리 실패" });
  };
  app.use(errors);
  return { router: app, close: () => db.close() };
}
