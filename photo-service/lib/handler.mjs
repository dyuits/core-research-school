import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { slideRequest } from "./slides.mjs";
import { checkPassword, isAdmin, issueToken } from "./auth.mjs";
import lessonMap from "../lesson-map.json" with { type: "json" };
const MAX_IMAGE = 2 * 1024 * 1024;
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const uuid =
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
async function readBody(request) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new HttpError(415, "JSON 요청이 필요합니다.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "요청 내용이 없습니다.");
  let length = 0;
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 3 * 1024 * 1024) {
      await reader.cancel();
      throw new HttpError(413, "사진 크기 제한을 초과했습니다.");
    }
    chunks.push(Buffer.from(value));
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    throw new HttpError(400, "입력 형식을 확인하세요.");
  }
}
function lesson(programId, session) {
  const number = Number(session);
  if (!lessonMap.some(l => l.programId === programId && l.number === number))
    throw new HttpError(400, "등록된 프로그램·차시를 선택하세요.");
  return { programId, session: number };
}
const key = (p, s, id) => `meta/${p}/${s}/${id}.json`;
const imageKey = (p, s, id) => `images/${p}/${s}/${id}.webp`;
export function createHandler(
  store,
  {
    passwordHash,
    authSecret,
    allowedOrigins = ["https://dyuits.github.io"],
  } = {}
) {
  return async function handle(request) {
    const url = new URL(request.url);
    const origin = request.headers.get("origin");
    const cors = {
      Vary: "Origin",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    };
    if (origin && allowedOrigins.includes(origin))
      Object.assign(cors, {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Max-Age": "600",
      });
    const json = (data, status = 200) =>
      Response.json(data, { status, headers: cors });
    try {
      if (origin && !allowedOrigins.includes(origin))
        throw new HttpError(403, "허용되지 않은 홈페이지입니다.");
      if (request.method === "OPTIONS")
        return new Response(null, { status: 204, headers: cors });
      if (!passwordHash || !authSecret)
        throw new HttpError(503, "사진 관리 서버 설정이 필요합니다.");
      const action = url.searchParams.get("action");
      if (request.method === "GET" && action === "status")
        return json({ ready: store.ready !== false, loginReady: true });
      if (request.method === "POST" && action === "login") {
        const body = await readBody(request);
        if (!checkPassword(body.password, passwordHash))
          throw new HttpError(401, "관리자 암호가 올바르지 않습니다.");
        return json({ token: issueToken(authSecret) });
      }
      if (store.ready === false)
        throw new HttpError(
          503,
          "사진 저장소 연결이 아직 완료되지 않았습니다."
        );
      if (action?.startsWith("slide"))
        return await slideRequest({
          request,
          url,
          store,
          authSecret,
          json,
          cors,
          lesson,
          readBody,
          HttpError,
        });
      if (!["GET", "POST", "DELETE"].includes(request.method))
        throw new HttpError(405, "지원하지 않는 요청입니다.");
      if (
        request.method !== "GET" &&
        !isAdmin(request.headers.get("authorization"), authSecret)
      )
        throw new HttpError(401, "관리자 로그인이 필요합니다.");
      if (request.method === "GET") {
        const { programId, session } = lesson(
          url.searchParams.get("programId"),
          url.searchParams.get("session")
        );
        const id = url.searchParams.get("imageId");
        if (id) {
          if (!uuid.test(id))
            throw new HttpError(400, "잘못된 사진 식별자입니다.");
          const meta = await store.readJson(key(programId, session, id));
          if (!meta?.published || meta.privacyConfirmed !== true)
            throw new HttpError(404, "사진을 찾을 수 없습니다.");
          const data = await store.readImage(imageKey(programId, session, id));
          if (!data) throw new HttpError(404, "사진을 찾을 수 없습니다.");
          return new Response(data, {
            headers: {
              ...cors,
              "Content-Type": "image/webp",
              "Content-Disposition": "inline",
            },
          });
        }
        const cursor = url.searchParams.get("cursor") || undefined;
        if (cursor && cursor.length > 2048)
          throw new HttpError(400, "목록 요청이 올바르지 않습니다.");
        const page = await store.list(`meta/${programId}/${session}/`, cursor);
        const entries = await Promise.all(
          page.paths.map(p => store.readJson(p))
        );
        const items = entries
          .filter(p => p?.published && p.privacyConfirmed === true)
          .map(p => ({
            id: p.id,
            caption: p.caption,
            createdAt: p.createdAt,
            width: p.width,
            height: p.height,
            imageUrl: `${url.origin}${url.pathname}?programId=${programId}&session=${session}&imageId=${p.id}`,
          }));
        return json({
          items,
          cursor: page.cursor ?? null,
          hasMore: page.hasMore,
        });
      }
      if (request.method === "DELETE") {
        const { programId, session } = lesson(
          url.searchParams.get("programId"),
          url.searchParams.get("session")
        );
        const id = url.searchParams.get("imageId");
        if (!uuid.test(id ?? ""))
          throw new HttpError(400, "잘못된 사진 식별자입니다.");
        const meta = await store.readJson(key(programId, session, id));
        if (!meta) throw new HttpError(404, "사진을 찾을 수 없습니다.");
        await store.writeJson(
          key(programId, session, id),
          { ...meta, published: false, hiddenAt: new Date().toISOString() },
          true
        );
        return json({ ok: true });
      }
      const body = await readBody(request);
      const { programId, session } = lesson(body.programId, body.session);
      if (body.privacyConfirmed !== true)
        throw new HttpError(400, "공개 전 개인정보·초상권 확인이 필요합니다.");
      if (
        typeof body.caption !== "string" ||
        body.caption.trim().length < 1 ||
        body.caption.length > 500
      )
        throw new HttpError(400, "사진 설명을 1~500자로 입력하세요.");
      if (
        typeof body.image !== "string" ||
        body.image.length > Math.ceil((MAX_IMAGE * 4) / 3) + 8 ||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(body.image)
      )
        throw new HttpError(400, "올바른 사진 파일이 필요합니다.");
      const input = Buffer.from(body.image, "base64");
      if (!input.length || input.length > MAX_IMAGE)
        throw new HttpError(413, "사진은 변환 후 2MB 이하여야 합니다.");
      const pipeline = sharp(input, {
        limitInputPixels: 25000000,
        animated: false,
      });
      const metadata = await pipeline.metadata();
      if (
        !["jpeg", "png", "webp"].includes(metadata.format) ||
        (metadata.pages ?? 1) > 1
      )
        throw new HttpError(415, "JPG·PNG·WebP 사진만 지원합니다.");
      const { data, info } = await pipeline
        .rotate()
        .resize({
          width: 2048,
          height: 2048,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 85 })
        .toBuffer({ resolveWithObject: true });
      const id = randomUUID();
      const path = imageKey(programId, session, id);
      const record = {
        id,
        programId,
        session,
        caption: body.caption.trim(),
        privacyConfirmed: true,
        published: true,
        createdAt: new Date().toISOString(),
        width: info.width,
        height: info.height,
        size: data.length,
      };
      await store.writeImage(path, data);
      try {
        await store.writeJson(key(programId, session, id), record);
      } catch (error) {
        await store.remove(path).catch(() => {});
        throw error;
      }
      return json(record, 201);
    } catch (error) {
      if (error instanceof HttpError)
        return json({ error: error.message }, error.status);
      console.error(
        "Photo service request failed",
        error instanceof Error ? error.name : "unknown"
      );
      return json(
        {
          error:
            "사진을 처리하지 못했습니다. 파일 형식과 서버 연결을 확인하세요.",
        },
        400
      );
    }
  };
}
