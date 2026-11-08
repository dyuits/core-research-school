import path from "node:path";
import { createHash } from "node:crypto";
import AdmZip from "adm-zip";
import * as CFB from "cfb";
import { fileTypeFromBuffer } from "file-type";
export const MAX_FILE_SIZE = 25 * 1024 * 1024;
export async function validateFile(name: string, bytes: Buffer) {
  if (
    !name ||
    name.length > 200 ||
    /[\\/\x00-\x1f\x7f]/.test(name) ||
    name === ".."
  )
    throw new Error("안전하지 않은 파일명입니다.");
  const ext = path.extname(name).slice(1).toLowerCase();
  if (
    ![
      "hwp",
      "hwpx",
      "pdf",
      "docx",
      "pptx",
      "xlsx",
      "png",
      "jpg",
      "jpeg",
      "zip",
    ].includes(ext) ||
    bytes.length === 0 ||
    bytes.length > MAX_FILE_SIZE
  )
    throw new Error("지원 형식 또는 25MB 용량 제한을 확인하세요.");
  if (ext === "hwp") {
    const compound = CFB.read(bytes, { type: "buffer" });
    const header = CFB.find(compound, "FileHeader");
    if (
      !header ||
      Buffer.from(header.content ?? [])
        .subarray(0, 17)
        .toString() !== "HWP Document File"
    )
      throw new Error("유효한 HWP 5 문서가 아닙니다.");
  } else if (["hwpx", "docx", "pptx", "xlsx", "zip"].includes(ext)) {
    const zip = new AdmZip(bytes);
    const entries = zip.getEntries();
    if (
      entries.length > 5000 ||
      entries.some(e => e.header.size > 100 * 1024 * 1024) ||
      entries.reduce((n, e) => n + e.header.size, 0) > 250 * 1024 * 1024
    )
      throw new Error("압축파일 내부 용량 제한을 초과했습니다.");
    if (entries.some(e => /(^\/|(^|\/)\.\.([/]|$)|\\)/.test(e.entryName)))
      throw new Error("압축파일 경로가 안전하지 않습니다.");
    const names = entries.map(e => e.entryName);
    if (
      ext === "hwpx" &&
      (zip.readAsText("mimetype").trim() !== "application/hwp+zip" ||
        !names.includes("Contents/content.hpf"))
    )
      throw new Error("HWPX 문서 구조가 올바르지 않습니다.");
    const root = {
      docx: "word/document.xml",
      pptx: "ppt/presentation.xml",
      xlsx: "xl/workbook.xml",
    }[ext];
    if (
      root &&
      (!names.includes("[Content_Types].xml") || !names.includes(root))
    )
      throw new Error("Office 문서 구조가 올바르지 않습니다.");
  } else {
    const type = await fileTypeFromBuffer(bytes);
    if (!type || type.ext !== (ext === "jpeg" ? "jpg" : ext))
      throw new Error("확장자와 실제 파일 형식이 다릅니다.");
  }
  return {
    format: ext,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}
