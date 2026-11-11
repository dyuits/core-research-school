import { test } from "node:test";
import assert from "node:assert/strict";
import {
  appendUploadFiles,
  uploadFileError,
} from "../client/src/lib/uploadFiles";
const photo = (name: string, lastModified = 10) =>
  new File(["image"], name, { type: "image/png", lastModified });

test("사진을 여러 번 추가해도 같은 파일은 중복 등록하지 않으며 다른 버전은 유지한다", () => {
  const first = photo("활동1.png");
  const second = photo("활동2.png");
  const initial = appendUploadFiles([], [first, second], "photos");
  const next = appendUploadFiles(
    initial.files,
    [photo("활동1.png"), photo("활동1.png", 20)],
    "photos"
  );
  assert.equal(next.files.length, 3);
  assert.deepEqual(initial.files, [first, second]);
  assert.equal(next.rejected.length, 0);
});
test("혼합 드롭에서는 유효한 사진을 유지하고 지원하지 않는 파일·빈 파일을 알려준다", () => {
  const good = photo("사진.png");
  const { files, rejected } = appendUploadFiles(
    [],
    [
      good,
      new File(["text"], "문서.txt", { type: "text/plain" }),
      new File([], "빈사진.png", { type: "image/png" }),
    ],
    "photos"
  );
  assert.deepEqual(files, [good]);
  assert.equal(rejected.length, 2);
});
test("PPT·PPTX·PDF 여러 파일을 함께 선택할 수 있고 사진을 PPT로 등록하지 않는다", () => {
  const slides = [
    new File(["slide"], "자료.PPTX"),
    new File(["slide"], "자료.ppt"),
    new File(["pdf"], "자료.PDF"),
  ];
  const { files, rejected } = appendUploadFiles(
    [],
    [...slides, photo("사진.png")],
    "slides"
  );
  assert.deepEqual(files, slides);
  assert.equal(rejected.length, 1);
});
test("파일당 사진 20MB, PPT 50MB 크기 제한을 선택 단계에서 확인한다", () => {
  const oversize = new File(
    [new Uint8Array(20 * 1024 * 1024 + 1)],
    "사진.png",
    { type: "image/png" }
  );
  assert.match(uploadFileError(oversize, "photos")!, /20MB/);
  const tooLarge = new File(
    [new Uint8Array(50 * 1024 * 1024 + 1)],
    "자료.pptx"
  );
  assert.match(uploadFileError(tooLarge, "slides")!, /50MB/);
});
