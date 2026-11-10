export type UploadKind = "photos" | "slides";
export function uploadFileError(file: File, kind: UploadKind): string | null {
  if (!file.size) return "빈 파일은 등록할 수 없습니다.";
  if (kind === "photos") {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
      return "JPG·PNG·WebP 사진을 선택하세요.";
    if (file.size > 20 * 1024 * 1024)
      return "사진은 파일당 20MB 이하로 선택하세요.";
  } else {
    if (!/\.(ppt|pptx)$/i.test(file.name)) return "PPT·PPTX 파일을 선택하세요.";
    if (file.size > 50 * 1024 * 1024)
      return "PPT는 파일당 50MB 이하로 선택하세요.";
  }
  return null;
}
export function appendUploadFiles(
  current: File[],
  incoming: File[],
  kind: UploadKind
) {
  const files = [...current];
  const rejected: string[] = [];
  const key = (file: File) =>
    JSON.stringify([file.name, file.size, file.lastModified, file.type]);
  const existing = new Set(current.map(key));
  for (const file of incoming) {
    const error = uploadFileError(file, kind);
    if (error) {
      rejected.push(`${file.name}: ${error}`);
      continue;
    }
    if (!existing.has(key(file))) {
      files.push(file);
      existing.add(key(file));
    }
  }
  return { files, rejected };
}
