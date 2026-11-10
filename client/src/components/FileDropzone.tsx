import { useId, useRef, useState, type DragEvent } from "react";
import { Files, UploadCloud, X } from "lucide-react";
import { appendUploadFiles, type UploadKind } from "@/lib/uploadFiles";

export default function FileDropzone({
  kind,
  files,
  onChange,
  disabled,
}: {
  kind: UploadKind;
  files: File[];
  onChange: (files: File[]) => void;
  disabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const helpId = useId();
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const photos = kind === "photos";
  const title = photos ? "활동 사진" : "수업 PPT 파일";
  function add(incoming: File[]) {
    if (disabled) return;
    const result = appendUploadFiles(files, incoming, kind);
    onChange(result.files);
    setErrors(result.rejected);
  }
  function hold(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
  }
  return (
    <section
      className="file-upload-field"
      aria-label={`${title} 여러 파일 등록`}
    >
      <div
        className={`file-dropzone ${dragging && !disabled ? "is-dragging" : ""} ${disabled ? "is-disabled" : ""}`}
        onDragEnter={event => {
          hold(event);
          if (!disabled && event.dataTransfer.types.includes("Files")) {
            dragDepth.current++;
            setDragging(true);
          }
        }}
        onDragOver={event => {
          hold(event);
          event.dataTransfer.dropEffect = disabled ? "none" : "copy";
        }}
        onDragLeave={event => {
          hold(event);
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (!dragDepth.current) setDragging(false);
        }}
        onDrop={event => {
          hold(event);
          dragDepth.current = 0;
          setDragging(false);
          add(Array.from(event.dataTransfer.files));
        }}
      >
        <span className="file-dropzone-icon">
          <UploadCloud size={30} aria-hidden="true" />
        </span>
        <h4>
          {dragging && !disabled
            ? "여기에 놓으면 추가됩니다"
            : `${title}을 한꺼번에 끌어다 놓으세요`}
        </h4>
        <p id={helpId}>
          {photos
            ? "JPG·PNG·WebP · 파일당 20MB 이하"
            : "PPT·PPTX · 파일당 50MB 이하"}
          <br />
          여러 번 추가할 수 있으며, 같은 파일은 한 번만 포함됩니다.
        </p>
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          {files.length ? "파일 더 선택하기" : "여러 파일 선택하기"}
        </button>
        <input
          className="sr-only"
          ref={inputRef}
          type="file"
          multiple
          accept={photos ? "image/jpeg,image/png,image/webp" : ".ppt,.pptx"}
          disabled={disabled}
          aria-label={`${title} 파일 선택`}
          aria-describedby={helpId}
          onChange={event => {
            add(Array.from(event.currentTarget.files ?? []));
            event.currentTarget.value = "";
          }}
        />
      </div>
      {!!errors.length && (
        <div className="file-dropzone-errors" role="alert">
          {errors.map((error, index) => (
            <p key={index}>{error}</p>
          ))}
        </div>
      )}
      {!!files.length && (
        <div className="upload-file-selection">
          <div className="upload-selection-heading">
            <b>
              <Files size={17} aria-hidden="true" /> 등록 대기 · {files.length}
              개
            </b>
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                onChange([]);
                setErrors([]);
              }}
            >
              선택 전체 비우기
            </button>
          </div>
          <ul>
            {files.map((file, index) => (
              <li
                key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
              >
                <div>
                  <strong>{file.name}</strong>
                  <small>{(file.size / 1024 / 1024).toFixed(2)} MB</small>
                </div>
                <button
                  type="button"
                  disabled={disabled}
                  aria-label={`${file.name} 선택 제외`}
                  onClick={() =>
                    onChange(files.filter((_, position) => position !== index))
                  }
                >
                  <X size={17} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <p className="upload-selection-help">
            파일을 모두 확인한 뒤 아래 ‘등록 및 공개’ 버튼으로 한꺼번에
            등록하세요.
          </p>
        </div>
      )}
    </section>
  );
}
