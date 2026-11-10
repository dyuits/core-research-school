import { test } from "node:test";
import assert from "node:assert/strict";
import { scryptSync } from "node:crypto";
import sharp from "sharp";
import { createHandler } from "../lib/handler.mjs";
import { isAdmin, issueToken } from "../lib/auth.mjs";
const secret = "a".repeat(64),
  password = "test-only-password";
const passwordHash = `test:${scryptSync(password, "test", 64).toString("hex")}`;
function storage() {
  const data = new Map();
  return {
    data,
    async readJson(k) {
      return data.has(k) ? JSON.parse(data.get(k)) : null;
    },
    async readImage(k) {
      return data.get(k) ?? null;
    },
    async writeImage(k, v) {
      data.set(k, v);
    },
    async writeJson(k, v) {
      data.set(k, JSON.stringify(v));
    },
    async remove(k) {
      data.delete(k);
    },
    async list(prefix) {
      return {
        paths: [...data.keys()].filter(k => k.startsWith(prefix)),
        hasMore: false,
      };
    },
  };
}
const url = "https://photos.example/api/photos";
function req(
  path = "",
  body,
  token,
  method = "POST",
  origin = "https://dyuits.github.io"
) {
  return new Request(url + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
const location = "?programId=creative-reading&session=1";
test("서버 인증·동의·형식 검증, 실제 이미지 변환, 익명 조회·공개 취소", async () => {
  const store = storage(),
    handler = createHandler(store, { passwordHash, authSecret: secret });
  assert.equal((await handler(req("", {}, undefined))).status, 401);
  assert.equal(
    (await handler(req("?action=login", { password: "wrong" }))).status,
    401
  );
  const login = await handler(req("?action=login", { password }));
  assert.equal(login.status, 200);
  const { token } = await login.json();
  assert.equal(
    (
      await handler(
        req(
          "?action=login",
          { password },
          undefined,
          "POST",
          "https://untrusted.example"
        )
      )
    ).status,
    403
  );
  const options = await handler(req("", undefined, undefined, "OPTIONS"));
  assert.equal(options.status, 204);
  assert.equal(
    options.headers.get("Access-Control-Allow-Origin"),
    "https://dyuits.github.io"
  );
  const bytes = await sharp({
    create: { width: 2400, height: 1600, channels: 3, background: "#557766" },
  })
    .jpeg()
    .withMetadata({ exif: { IFD0: { Artist: "Test teacher" } } })
    .toBuffer();
  const data = {
    programId: "creative-reading",
    session: 1,
    caption: "시스템 검증용 사진",
    privacyConfirmed: true,
    image: bytes.toString("base64"),
  };
  assert.equal(
    (await handler(req("", { ...data, privacyConfirmed: false }, token)))
      .status,
    400
  );
  assert.equal(
    (await handler(req("", { ...data, session: 999 }, token))).status,
    400
  );
  const svg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20"/></svg>'
  );
  assert.equal(
    (await handler(req("", { ...data, image: svg.toString("base64") }, token)))
      .status,
    415
  );
  const upload = await handler(req("", data, token));
  assert.equal(upload.status, 201);
  const record = await upload.json();
  assert.equal(record.width, 2048);
  assert.equal(record.height, 1365);
  const list = await handler(new Request(url + location));
  const { items } = await list.json();
  assert.equal(items.length, 1);
  assert.equal(items[0].caption, data.caption);
  const publicImage = await handler(new Request(items[0].imageUrl));
  assert.equal(publicImage.status, 200);
  assert.equal(publicImage.headers.get("Content-Type"), "image/webp");
  const converted = await publicImage.arrayBuffer();
  const meta = await sharp(Buffer.from(converted)).metadata();
  assert.equal(meta.format, "webp");
  assert.equal(meta.exif, undefined);
  // A different handler instance can read the same permanent storage without any login state.
  const other = createHandler(store, { passwordHash, authSecret: secret });
  assert.equal((await other(new Request(items[0].imageUrl))).status, 200);
  const imageLocation = location + `&imageId=${record.id}`;
  assert.equal(
    (await handler(req(imageLocation, undefined, undefined, "DELETE"))).status,
    401
  );
  assert.equal(
    (await handler(req(imageLocation, undefined, token, "DELETE"))).status,
    200
  );
  assert.equal((await other(new Request(items[0].imageUrl))).status, 404);
  assert.equal(
    (await (await other(new Request(url + location))).json()).items.length,
    0
  );
});
test("토큰 위조·만료와 미연결 저장소를 차단한다", async () => {
  const token = issueToken(secret, 1000);
  assert.equal(isAdmin(`Bearer ${token}`, secret, 2000), true);
  assert.equal(isAdmin(`Bearer ${token}x`, secret, 2000), false);
  assert.equal(isAdmin(`Bearer ${token}`, secret, 1000 + 9 * 3600000), false);
  const handler = createHandler(
    { ...storage(), ready: false },
    { passwordHash, authSecret: secret }
  );
  const status = await handler(new Request(url + "?action=status"));
  assert.equal((await status.json()).ready, false);
  assert.equal((await handler(new Request(url + location))).status, 503);
});
test("저장소가 없어도 로그인은 가능하고 잘못된 암호는 거절한다", async () => {
  const h = createHandler(
    { ...storage(), ready: false },
    { passwordHash, authSecret: secret }
  );
  assert.equal((await h(req("?action=login", { password }))).status, 200);
  assert.equal(
    (await h(req("?action=login", { password: "wrong" }))).status,
    401
  );
});
test("PPTX 형식 검증, 원본 무결성, 익명 다운로드 및 공개 취소", async () => {
  const { default: AdmZip } = await import("adm-zip");
  const { validateSlide } = await import("../lib/slides.mjs");
  const zip = new AdmZip();
  zip.addFile(
    "[Content_Types].xml",
    Buffer.from(
      '<Types><Override ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/></Types>'
    )
  );
  zip.addFile("ppt/presentation.xml", Buffer.from("<p:presentation/>"));
  const bytes = zip.toBuffer();
  validateSlide(bytes, "pptx");
  const { default: CFB } = await import("cfb");
  const cfb = CFB.utils.cfb_new();
  CFB.utils.cfb_add(
    cfb,
    "PowerPoint Document",
    Buffer.from("PowerPoint binary test stream")
  );
  validateSlide(CFB.write(cfb, { type: "buffer" }), "ppt");
  assert.throws(() => validateSlide(Buffer.from("renamed text"), "pptx"));
  assert.throws(() => validateSlide(Buffer.from("renamed text"), "ppt"));
  const store = storage();
  const h = createHandler(store, { passwordHash, authSecret: secret });
  const token = issueToken(secret);
  const id = "f5db21d1-b4a4-4c48-907e-6c5961f734fe";
  const path = `slides/creative-reading/1/${id}.pptx`;
  store.data.set(path, bytes);
  const data = {
    programId: "creative-reading",
    session: 1,
    id,
    ext: "pptx",
    name: "수업 발표.pptx",
    privacyConfirmed: true,
  };
  assert.equal((await h(req("?action=slide-finalize", data))).status, 401);
  assert.equal(
    (
      await h(
        req("?action=slide-upload", {
          type: "blob.generate-client-token",
          payload: { pathname: path, clientPayload: JSON.stringify(data) },
        })
      )
    ).status,
    401
  );
  assert.equal(
    (
      await h(
        req(
          "?action=slide-finalize",
          { ...data, privacyConfirmed: false },
          token
        )
      )
    ).status,
    400
  );
  assert.equal(
    (await h(req("?action=slide-finalize", data, token))).status,
    201
  );
  const other = createHandler(store, { passwordHash, authSecret: secret });
  const list = await (
    await other(new Request(url + location + "&action=slides"))
  ).json();
  assert.equal(list.items.length, 1);
  const download = await other(new Request(list.items[0].downloadUrl));
  assert.equal(download.status, 200);
  assert.deepEqual(Buffer.from(await download.arrayBuffer()), bytes);
  assert.match(download.headers.get("Content-Disposition"), /filename\*=UTF-8/);
  assert.equal(
    (
      await other(
        req(
          location + `&action=slides&fileId=${id}`,
          undefined,
          undefined,
          "DELETE"
        )
      )
    ).status,
    401
  );
  assert.equal(
    (
      await other(
        req(
          location + `&action=slides&fileId=${id}`,
          undefined,
          token,
          "DELETE"
        )
      )
    ).status,
    200
  );
  assert.equal(
    (await other(new Request(list.items[0].downloadUrl))).status,
    404
  );
  assert.ok(store.data.has(path), "공개 취소 시 원본을 삭제하지 않는다");
});
