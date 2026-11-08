import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { scryptSync, createHash } from "node:crypto";
import express from "express";
import request from "supertest";
import AdmZip from "adm-zip";
import * as CFB from "cfb";
import { createCatalog } from "./catalog";
import { validateFile, MAX_FILE_SIZE } from "./files";

const payload = (kind: string, extra: Record<string, unknown> = {}) => ({
  kind,
  status: "published",
  programId: null,
  sessionId: null,
  position: 1,
  anonymized: false,
  data: { title: "검증용 자료" },
  ...extra,
});
function hwpx() {
  const z = new AdmZip();
  z.addFile("mimetype", Buffer.from("application/hwp+zip"));
  z.addFile("Contents/content.hpf", Buffer.from("<package/>"));
  return z.toBuffer();
}
function hwp() {
  const c = CFB.utils.cfb_new();
  CFB.utils.cfb_add(
    c,
    "FileHeader",
    Buffer.concat([Buffer.from("HWP Document File"), Buffer.alloc(239)])
  );
  return Buffer.from(CFB.write(c, { type: "buffer" }));
}

test("인증·관계·공개 범위·원본 무결성·재시작 영속성", async () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "school-"));
  const passwordHash = `test:${scryptSync("test-password", "test", 64).toString("hex")}`;
  let store = createCatalog({ directory, passwordHash, secure: false });
  const makeApp = () => {
    const app = express();
    app.use("/api", store.router);
    return app;
  };
  let app = makeApp();
  let agent = request.agent(app);
  const put = (id: string, body: object) =>
    agent.put(`/api/entries/${id}`).set("X-School-Request", "1").send(body);
  try {
    assert.equal((await put("p", payload("programs"))).status, 401);
    assert.equal(
      (await agent.post("/api/login").send({ password: "wrong" })).status,
      401
    );
    assert.equal(
      (await agent.post("/api/login").send({ password: "test-password" }))
        .status,
      200
    );
    assert.equal(
      (await agent.put("/api/entries/p").send(payload("programs"))).status,
      403
    );
    assert.equal((await put("p", payload("programs"))).status, 200);
    assert.equal(
      (await put("s1", payload("sessions", { programId: "missing" }))).status,
      400
    );
    assert.equal(
      (await put("s1", payload("sessions", { programId: "p", position: 2 })))
        .status,
      200
    );
    assert.equal(
      (await put("s2", payload("sessions", { programId: "p", position: 1 })))
        .status,
      200
    );
    let list = await request(app).get("/api/entries?kind=sessions&programId=p");
    assert.deepEqual(
      list.body.items.map((e: { id: string }) => e.id),
      ["s2", "s1"]
    );
    assert.equal(
      (await put("s1", payload("sessions", { programId: "p", position: 0 })))
        .status,
      200
    );
    list = await request(app).get("/api/entries?kind=sessions&programId=p");
    assert.equal(list.body.items[0].id, "s1");
    const record = payload("records", {
      programId: "p",
      sessionId: "s1",
      data: {
        title: "기재 예시",
        category: "교과 세부능력 및 특기사항",
        example: "테스트",
      },
    });
    assert.equal((await put("r", record)).status, 400);
    assert.equal((await put("r", { ...record, anonymized: true })).status, 200);
    assert.equal(
      (
        await put(
          "a",
          payload("assessments", { programId: "p", sessionId: "s1" })
        )
      ).status,
      400
    );
    assert.equal(
      (
        await put(
          "a",
          payload("assessments", {
            programId: "p",
            sessionId: "s1",
            anonymized: true,
          })
        )
      ).status,
      200
    );
    assert.equal(
      (
        await put(
          "research",
          payload("resources", {
            data: { title: "연구보고서", category: "연구보고서" },
          })
        )
      ).status,
      200
    );
    const ids: string[] = [];
    for (const [name, bytes] of [
      ["지도안.hwp", hwp()],
      ["학습지.hwpx", hwpx()],
    ] as const) {
      const upload = await agent
        .post("/api/entries/s1/attachments")
        .set("X-School-Request", "1")
        .field("category", "교수·학습 지도안")
        .attach("file", bytes, name);
      assert.equal(upload.status, 201, JSON.stringify(upload.body));
      ids.push(upload.body.id);
      const download = await request(app).get(
        `/api/attachments/${upload.body.id}/download`
      );
      assert.equal(download.status, 200);
      assert.equal(
        createHash("sha256").update(download.body).digest("hex"),
        createHash("sha256").update(bytes).digest("hex")
      );
      assert.match(download.headers["content-disposition"], /attachment/);
    }
    assert.equal(
      (
        await agent
          .post("/api/entries/s1/attachments")
          .set("X-School-Request", "1")
          .attach("file", Buffer.from("fake"), "fake.hwpx")
      ).status,
      400
    );
    assert.equal(
      (
        await request(app)
          .delete(`/api/attachments/${ids[0]}`)
          .set("X-School-Request", "1")
      ).status,
      401
    );
    assert.equal(
      (await agent.delete("/api/entries/p").set("X-School-Request", "1"))
        .status,
      409
    );
    assert.equal(
      (await agent.delete("/api/entries/s1").set("X-School-Request", "1"))
        .status,
      409
    );
    await put("p", payload("programs", { status: "private" }));
    assert.equal((await request(app).get("/api/entries/s1")).status, 404);
    assert.equal((await request(app).get("/api/entries/r")).status, 404);
    assert.equal(
      (await request(app).get(`/api/attachments/${ids[0]}/download`)).status,
      404
    );
    assert.equal(
      (await agent.get(`/api/attachments/${ids[0]}/download`)).status,
      200
    );
    await put("p", payload("programs"));
    store.close();
    store = createCatalog({ directory, passwordHash, secure: false });
    app = makeApp();
    agent = request.agent(app);
    assert.equal(
      (await request(app).get(`/api/attachments/${ids[0]}/download`)).status,
      200
    );
    assert.equal(
      (await request(app).get("/api/entries/s1/attachments")).body.length,
      2
    );
    assert.equal(
      (await request(app).get("/api/entries?kind=resources&q=연구보고서")).body
        .total,
      1
    );
    assert.equal((await request(app).get("/api/auth")).body.admin, false);
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
test("실제 형식·용량·경로 검증", async () => {
  await assert.rejects(validateFile("../x.hwp", hwp()));
  await assert.rejects(validateFile("x.png", Buffer.from("%PDF-1.4")));
  await assert.rejects(validateFile("x.hwp", Buffer.from("fake")));
  await assert.rejects(validateFile("x.zip", Buffer.alloc(MAX_FILE_SIZE + 1)));
  const z = new AdmZip();
  z.addFile("random.txt", Buffer.from("x"));
  await assert.rejects(validateFile("x.docx", z.toBuffer()));
  const valid = await validateFile("x.hwpx", hwpx());
  assert.equal(valid.format, "hwpx");
});
