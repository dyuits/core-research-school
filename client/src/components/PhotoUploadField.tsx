import { photoSource } from "@/lib/photoSource";
import { useEffect, useState } from "react";
import FileDropzone from "./FileDropzone";

type Preview = { name: string; url?: string; error?: string };
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
    let active = true;
    const urls: string[] = [];
    setPreviews([]);
    async function loadPreviews() {
      for (const file of files) {
        if (!active) return;
        try {
          const source = await photoSource(file);
          if (!active) return;
          const url = URL.createObjectURL(source);
          urls.push(url);
          setPreviews(previous => [...previous, { name: file.name, url }]);
        } catch (error) {
          if (active)
            setPreviews(previous => [
              ...previous,
              {
                name: file.name,
                error:
                  error instanceof Error
                    ? error.message
                    : "사진을 불러오지 못했습니다.",
              },
            ]);
        }
      }
    }
    void loadPreviews();
    return () => {
      active = false;
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [files]);
  return (
    <>
      <FileDropzone
        kind="photos"
        files={files}
        onChange={onChange}
        disabled={disabled}
      />
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
          {previews.length < files.length && (
            <p role="status">사진 미리보기를 준비하고 있습니다.</p>
          )}
          <div className="photo-selection-grid">
            {previews.map((preview, index) => (
              <figure key={`${preview.name}-${index}`}>
                {preview.url ? (
                  <img
                    src={preview.url}
                    alt={`업로드 전 미리보기: ${preview.name}`}
                    onError={() =>
                      setPreviews(previous =>
                        previous.map(item =>
                          item.url === preview.url
                            ? {
                                name: item.name,
                                error:
                                  "사진을 읽을 수 없습니다. JPG 또는 PNG로 내보낸 뒤 다시 선택하세요.",
                              }
                            : item
                        )
                      )
                    }
                  />
                ) : (
                  <p role="alert">{preview.error}</p>
                )}
                <figcaption>{preview.name}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
