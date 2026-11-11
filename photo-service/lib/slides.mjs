import { createHash } from "node:crypto";
import { handleUpload } from "@vercel/blob/client";
import AdmZip from "adm-zip";
import CFB from "cfb";
import { isAdmin } from "./auth.mjs";
export const MAX_SLIDE = 50 * 1024 * 1024;
const mimeTypes = {
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  pdf: "application/pdf",
};
const uuid =
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
export function validateSlide(bytes, ext) {
  if (!bytes.length || bytes.length > MAX_SLIDE)
    throw new Error("파일은 50MB 이하여야 합니다.");
  if (ext === "pptx") {
    const zip = new AdmZip(bytes);
    const entries = zip.getEntries();
    if (
      entries.length > 10000 ||
      entries.reduce((n, e) => n + e.header.size, 0) > 200 * 1024 * 1024 ||
      entries.some(
        e =>
          e.entryName.split("/").includes("..") ||
          e.entryName.startsWith("/") ||
          e.entryName.includes("\\") ||
          e.header.flags & 1
      )
    )
      throw new Error("지원하지 않는 압축 구조입니다.");
    const types = zip.getEntry("[Content_Types].xml");
    if (
      !types ||
      types.header.size > 1024 * 1024 ||
      !zip.getEntry("ppt/presentation.xml") ||
      !zip
        .readAsText(types)
        .includes(
          "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"
        )
    )
      throw new Error("실제 PPTX 형식이 아닙니다.");
    if (entries.some(e => /vbaProject\.bin$/i.test(e.entryName)))
      throw new Error("매크로가 포함된 자료는 올릴 수 없습니다.");
  } else if (ext === "ppt") {
    if (!bytes.subarray(0, 8).equals(Buffer.from("d0cf11e0a1b11ae1", "hex")))
      throw new Error("실제 PPT 형식이 아닙니다.");
    const file = CFB.read(bytes, { type: "buffer" });
    if (
      !file.FileIndex.some(
        e => e.name === "PowerPoint Document" && e.size > 0
      ) ||
      file.FullPaths.some(p => /VBA|Macros/i.test(p))
    )
      throw new Error("PPT 형식을 확인하거나 매크로를 제거하세요.");
  } else if (ext === "pdf") {
    if (
      !/^%PDF-[12]\.\d/.test(bytes.subarray(0, 8).toString("ascii")) ||
      !/%%EOF\s*$/.test(bytes.subarray(-1024).toString("latin1"))
    )
      throw new Error("PDF 파일 형식을 확인하세요.");
  } else throw new Error("PPT·PPTX·PDF만 지원합니다.");
}
export async function slideRequest({
  request,
  url,
  store,
  authSecret,
  json,
  cors,
  lesson,
  readBody,
  HttpError,
}) {
  const action = url.searchParams.get("action");
  const admin = () => {
    if (!isAdmin(request.headers.get("authorization"), authSecret))
      throw new HttpError(401, "관리자 로그인이 필요합니다.");
  };
  function scope(body) {
    const loc = lesson(body.programId, body.session);
    if (!uuid.test(body.id ?? "") || !Object.hasOwn(mimeTypes, body.ext))
      throw new HttpError(400, "자료 식별자·형식이 올바르지 않습니다.");
    return {
      ...loc,
      id: body.id,
      ext: body.ext,
      path: `slides/${loc.programId}/${loc.session}/${body.id}.${body.ext}`,
      key: `slides-meta/${loc.programId}/${loc.session}/${body.id}.json`,
    };
  }
  if (action === "slide-upload" && request.method === "POST") {
    const body = await readBody(request);
    if (body.type !== "blob.upload-completed") admin();
    return json(
      await handleUpload({
        body,
        request,
        onBeforeGenerateToken: async (pathname, payload) => {
          admin();
          const data = JSON.parse(payload || "{}");
          const loc = scope(data);
          if (pathname !== loc.path || data.privacyConfirmed !== true)
            throw new HttpError(
              400,
              "공개 전 개인정보·저작권 확인이 필요합니다."
            );
          return {
            maximumSizeInBytes: MAX_SLIDE,
            addRandomSuffix: false,
            allowOverwrite: false,
            validUntil: Date.now() + 15 * 60 * 1000,
            allowedContentTypes:
              loc.ext === "pdf"
                ? [mimeTypes.pdf]
                : [
                    mimeTypes.ppt,
                    mimeTypes.pptx,
                    "application/octet-stream",
                    "application/zip",
                  ],
          };
        },
      })
    );
  }
  if (action === "slide-finalize" && request.method === "POST") {
    admin();
    const body = await readBody(request);
    const loc = scope(body);
    if (
      body.privacyConfirmed !== true ||
      typeof body.name !== "string" ||
      body.name.length > 200 ||
      /[\x00-\x1f/\\]/.test(body.name) ||
      !body.name.toLowerCase().endsWith("." + loc.ext)
    )
      throw new HttpError(400, "파일명과 공개 확인 항목을 확인하세요.");
    const previous = await store.readJson(loc.key);
    if (previous) return json(previous);
    const stream = await store.readImage(loc.path);
    if (!stream) throw new HttpError(404, "업로드한 파일을 찾을 수 없습니다.");
    const reader = new Response(stream).body.getReader();
    let size = 0;
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_SLIDE) {
        await reader.cancel();
        throw new HttpError(413, "50MB 제한을 초과했습니다.");
      }
      chunks.push(Buffer.from(value));
    }
    const bytes = Buffer.concat(chunks);
    try {
      validateSlide(bytes, loc.ext);
    } catch (e) {
      await store.remove(loc.path).catch(() => {});
      throw new HttpError(415, e.message);
    }
    const record = {
      ...loc,
      name: body.name,
      caption: String(body.caption || "").slice(0, 500),
      size,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      createdAt: new Date().toISOString(),
      published: true,
      privacyConfirmed: true,
    };
    await store.writeJson(loc.key, record);
    return json(record, 201);
  }
  const { programId, session } = lesson(
    url.searchParams.get("programId"),
    url.searchParams.get("session")
  );
  const id = url.searchParams.get("fileId");
  const prefix = `slides-meta/${programId}/${session}/`;
  if (id) {
    if (!uuid.test(id))
      throw new HttpError(400, "자료 식별자가 올바르지 않습니다.");
    if (request.method === "DELETE") admin();
    const meta = await store.readJson(`${prefix}${id}.json`);
    if (!meta?.published || meta.privacyConfirmed !== true)
      throw new HttpError(404, "자료를 찾을 수 없습니다.");
    if (request.method === "DELETE") {
      await store.writeJson(
        `${prefix}${id}.json`,
        { ...meta, published: false },
        true
      );
      return json({ ok: true });
    }
    if (request.method !== "GET")
      throw new HttpError(405, "지원하지 않는 요청입니다.");
    const stream = await store.readImage(meta.path);
    if (!stream) throw new HttpError(404, "자료를 찾을 수 없습니다.");
    return new Response(stream, {
      headers: {
        ...cors,
        "Content-Type": mimeTypes[meta.ext],
        "Content-Disposition": `${meta.ext === "pdf" && url.searchParams.get("preview") === "1" ? "inline" : "attachment"}; filename="lesson.${meta.ext}"; filename*=UTF-8''${encodeURIComponent(meta.name)}`,
        "Content-Length": String(meta.size),
        "X-File-SHA256": meta.sha256,
      },
    });
  }
  if (request.method !== "GET")
    throw new HttpError(405, "지원하지 않는 요청입니다.");
  const cursor = url.searchParams.get("cursor") || undefined;
  if (cursor?.length > 2048)
    throw new HttpError(400, "목록 요청이 올바르지 않습니다.");
  const page = await store.list(prefix, cursor);
  const items = (await Promise.all(page.paths.map(p => store.readJson(p))))
    .filter(p => p?.published && p.privacyConfirmed === true)
    .map(({ id, name, caption, size, ext, createdAt, sha256 }) => ({
      id,
      name,
      caption,
      size,
      ext,
      createdAt,
      sha256,
      downloadUrl: `${url.origin}${url.pathname}?action=slides&programId=${programId}&session=${session}&fileId=${id}`,
    }));
  return json({ items, cursor: page.cursor ?? null, hasMore: page.hasMore });
}
