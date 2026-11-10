import { useEffect, useState } from "react";

type Preview = { name: string; url: string };
export default function PhotoUploadField({
  files,
  onChange,
  disabled,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  disabled: boolean;
}) {
  const [previews, setPreviews] = useState<Preview[]>([]);
  useEffect(() => {
    const items = files
      .filter(
        file =>
          ["image/jpeg", "image/png", "image/webp"].includes(file.type) &&
          file.size <= 20 * 1024 * 1024
      )
      .map(file => ({ name: file.name, url: URL.createObjectURL(file) }));
    setPreviews(items);
    return () => items.forEach(item => URL.revokeObjectURL(item.url));
  }, [files]);
  return (
    <>
      <label>
        활동 사진 (여러 장 선택 가능)
        <input
          type="file"
          name="photos"
          multiple
          required
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled}
          onChange={event =>
            onChange(Array.from(event.currentTarget.files ?? []))
          }
        />
      </label>
      {!!files.length && (
        <section
          className="photo-selection-preview"
          aria-label="선택한 사진 미리보기"
        >
          <h4>선택한 사진 미리보기 · {files.length}장</h4>
          <p>
            아직 공개되지 않은 사진입니다. 사진과 설명을 확인한 뒤 ‘사진 등록 및
            공개’를 눌러 주세요.
          </p>
          {files.some(
            file =>
              !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
              file.size > 20 * 1024 * 1024
          ) && (
            <p role="alert">
              JPG·PNG·WebP, 파일당 20MB 이하의 사진만 등록할 수 있습니다.
            </p>
          )}
          <div className="photo-selection-grid">
            {previews.map((preview, index) => (
              <figure key={`${preview.name}-${index}`}>
                <img
                  src={preview.url}
                  alt={`업로드 전 미리보기: ${preview.name}`}
                />
                <figcaption>{preview.name}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
