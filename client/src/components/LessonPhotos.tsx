import { useEffect, useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import PhotoUploadField from "./PhotoUploadField";
import type { CoreProgram } from "@/data/corePrograms";
import { mediaSessionsFor } from "@/data/mediaSessions";
import { isFestivalProgram } from "@/data/festivalPrograms";
type Photo = {
  id: string;
  caption: string;
  createdAt: string;
  imageUrl: string;
  width: number;
  height: number;
};
type Page = { items: Photo[]; cursor: string | null; hasMore: boolean };
const tokenKey = "core-photo-admin-session";
function storedToken() {
  try {
    return sessionStorage.getItem(tokenKey) || "";
  } catch {
    return "";
  }
}
async function preparePhoto(file: File): Promise<string> {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 20 * 1024 * 1024
  )
    throw new Error("JPG·PNG·WebP 사진(원본 20MB 이하)을 선택하세요.");
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  try {
    const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("사진 변환을 지원하지 않는 브라우저입니다.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        b =>
          b ? resolve(b) : reject(new Error("사진을 변환하지 못했습니다.")),
        "image/webp",
        0.82
      )
    );
    if (blob.size > 2 * 1024 * 1024)
      throw new Error("사진을 더 작은 크기로 저장한 뒤 다시 올려 주세요.");
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = () => reject(new Error("사진을 읽지 못했습니다."));
      reader.readAsDataURL(blob);
    });
  } finally {
    bitmap.close();
  }
}
export default function LessonPhotos({ program }: { program: CoreProgram }) {
  const sessions = mediaSessionsFor(program);
  const festival = isFestivalProgram(program);
  const activityLabel = festival ? "축제 활동" : "수업 차시";
  const [session, setSession] = useState(sessions[0]?.number ?? 1);
  const [endpoint, setEndpoint] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [page, setPage] = useState<{ cursor: string | null; hasMore: boolean }>(
    { cursor: null, hasMore: false }
  );
  const [token, setToken] = useState(storedToken);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [version, setVersion] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);
  function remember(value: string) {
    setToken(value);
    try {
      value
        ? sessionStorage.setItem(tokenKey, value)
        : sessionStorage.removeItem(tokenKey);
    } catch {
      /* Login can remain in memory when browser storage is unavailable. */
    }
  }
  useEffect(() => {
    let alive = true;
    fetch(`${import.meta.env.BASE_URL}photo-service.json`)
      .then(r => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(config => {
        const url = new URL(config.endpoint);
        if (url.protocol !== "https:") throw new Error();
        return fetch(`${url.toString()}?action=status`).then(async response => {
          const status = await response.json();
          if (!response.ok)
            throw new Error("사진 저장소 연결이 아직 완료되지 않았습니다.");
          if (alive) {
            setEndpoint(url.toString());
            setStorageReady(status.ready);
            setLoading(false);
          }
        });
      })
      .catch(() => {
        if (alive) {
          setError(
            "사진 저장소 연결이 아직 완료되지 않았습니다. 연결 후 사진 등록·공유를 사용할 수 있습니다."
          );
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!endpoint || !storageReady) return;
    let alive = true;
    setLoading(true);
    setError("");
    const url = new URL(endpoint);
    url.searchParams.set("programId", program.id);
    url.searchParams.set("session", String(session));
    fetch(url)
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "사진을 불러오지 못했습니다.");
        return data as Page;
      })
      .then(data => {
        if (alive) {
          setPhotos(data.items);
          setPage({ cursor: data.cursor, hasMore: data.hasMore });
        }
      })
      .catch(e => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [endpoint, storageReady, program.id, session, version]);
  async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(url, init);
    const data = await response.json();
    if (response.status === 401) remember("");
    if (!response.ok)
      throw new Error(data.error || "사진 요청이 실패했습니다.");
    return data;
  }
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }
  function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const password = new FormData(form).get("password");
    form.reset();
    void run(async () => {
      const url = new URL(endpoint);
      url.searchParams.set("action", "login");
      const result = await request<{ token: string }>(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      remember(result.token);
      setNotice("관리자로 로그인했습니다.");
    });
  }
  function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const picked = data
      .getAll("photos")
      .filter((f): f is File => f instanceof File && f.size > 0);
    const caption = String(data.get("caption") || "");
    const privacyConfirmed = data.get("privacy") === "on";
    void run(async () => {
      if (!picked.length) throw new Error("사진을 선택하세요.");
      let uploaded = 0;
      let lastUploaded: Photo | null = null;
      try {
        for (const file of picked) {
          const image = await preparePhoto(file);
          const saved = await request<Omit<Photo, "imageUrl">>(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              programId: program.id,
              session,
              caption,
              privacyConfirmed,
              image,
            }),
          });
          const imageUrl = new URL(endpoint);
          imageUrl.search = new URLSearchParams({
            programId: program.id,
            session: String(session),
            imageId: saved.id,
          }).toString();
          lastUploaded = { ...saved, imageUrl: imageUrl.toString() };
          const publishedPhoto = lastUploaded;
          setPhotos(previous => [
            publishedPhoto,
            ...previous.filter(photo => photo.id !== publishedPhoto.id),
          ]);
          uploaded++;
          setNotice(`${uploaded}/${picked.length}장 등록 완료`);
        }
        form.reset();
        setSelectedFiles([]);
        setPreviewPhoto(lastUploaded);
        setNotice(
          `${uploaded}장을 공개했습니다. 다른 선생님도 이 차시에서 볼 수 있습니다.`
        );
      } finally {
        setVersion(v => v + 1);
      }
    });
  }
  return (
    <section className="lesson-photos" aria-label="차시별 수업활동 사진">
      <h3>{festival ? "축제활동 사진" : "차시별 수업활동 사진"}</h3>
      {endpoint && !storageReady && (
        <p className="photo-error">
          관리자 로그인은 가능합니다. 사진·PPT 등록 및 공유는 파일 저장소 연결
          후 사용할 수 있습니다.
        </p>
      )}
      <p>공개된 사진은 로그인하지 않은 선생님도 볼 수 있습니다.</p>
      <label className="photo-session-label">
        {activityLabel}
        <select
          value={session}
          disabled={busy}
          onChange={e => {
            setSession(Number(e.target.value));
            setPhotos([]);
            setPage({ cursor: null, hasMore: false });
            setPreviewPhoto(null);
            setNotice("");
          }}
        >
          {sessions.map(s => (
            <option key={s.number} value={s.number}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p className="photo-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="photo-notice" role="status">
          {notice}
        </p>
      )}
      <div className="photo-gallery-heading">
        <h4>{festival ? program.title : `${session}차시`} 공개 사진</h4>
        <button
          type="button"
          disabled={busy || loading || !endpoint}
          onClick={() => setVersion(v => v + 1)}
        >
          사진 새로고침
        </button>
      </div>
      {loading ? (
        <p role="status">사진을 불러오는 중입니다.</p>
      ) : !photos.length && !error ? (
        <p className="photo-empty">등록된 수업활동 사진이 없습니다.</p>
      ) : null}
      <div className="photo-gallery">
        {photos.map(photo => (
          <figure key={photo.id}>
            <button
              type="button"
              className="photo-preview-trigger"
              onClick={() => setPreviewPhoto(photo)}
              aria-label={`${photo.caption} 사진 크게 보기`}
            >
              <img
                src={photo.imageUrl}
                alt={photo.caption}
                width={photo.width}
                height={photo.height}
                loading="lazy"
              />
              <span>사진 크게 보기 ↗</span>
            </button>
            <figcaption>
              <p>{photo.caption}</p>
              <small>
                {new Date(photo.createdAt).toLocaleDateString("ko-KR", {
                  timeZone: "Asia/Seoul",
                })}
              </small>
              {token && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (
                      !window.confirm(
                        "다른 선생님에게 이 사진이 보이지 않도록 공개를 취소할까요?"
                      )
                    )
                      return;
                    void run(async () => {
                      const url = new URL(endpoint);
                      url.searchParams.set("programId", program.id);
                      url.searchParams.set("session", String(session));
                      url.searchParams.set("imageId", photo.id);
                      await request(url.toString(), {
                        method: "DELETE",
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      setVersion(v => v + 1);
                    });
                  }}
                >
                  공개 취소
                </button>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
      {page.hasMore && (
        <button
          type="button"
          disabled={busy || loading}
          onClick={() =>
            void run(async () => {
              const url = new URL(endpoint);
              url.searchParams.set("programId", program.id);
              url.searchParams.set("session", String(session));
              if (page.cursor) url.searchParams.set("cursor", page.cursor);
              const result = await request<Page>(url.toString());
              setPhotos(previous => [...previous, ...result.items]);
              setPage({ cursor: result.cursor, hasMore: result.hasMore });
            })
          }
        >
          사진 더 보기
        </button>
      )}
      <details className="photo-admin">
        <summary>관리자 사진 등록</summary>
        {!token ? (
          <form onSubmit={login}>
            <p>사진 등록·공개 취소는 관리자만 할 수 있습니다.</p>
            <label>
              관리자 암호
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                maxLength={128}
              />
            </label>
            <button disabled={busy || !endpoint}>관리자 로그인</button>
          </form>
        ) : (
          <>
            <button type="button" disabled={busy} onClick={() => remember("")}>
              로그아웃
            </button>
            <form onSubmit={upload}>
              <p>
                <b>
                  {program.title}
                  {!festival && ` · ${session}차시`}
                </b>
                에 등록합니다.
              </p>
              <label>
                사진 설명
                <input
                  name="caption"
                  required
                  maxLength={500}
                  placeholder="수업 중 어떤 활동인지 설명해 주세요."
                />
              </label>
              <PhotoUploadField
                files={selectedFiles}
                onChange={setSelectedFiles}
                disabled={busy}
              />
              <p>
                JPG·PNG·WebP, 원본 파일당 20MB 이하. 공개용 사진은 자동으로
                크기를 조정하고 위치정보 등 메타데이터를 제거합니다.
              </p>
              <label className="photo-privacy">
                <input type="checkbox" name="privacy" required />
                학생 얼굴·성명·학번·명찰·활동지의 식별 정보가 드러나지 않도록
                처리했고, 사진 공개에 필요한 동의·초상권을 확인했습니다.
              </label>
              <button disabled={busy || !endpoint || !storageReady}>
                {busy ? "사진 등록 중…" : "사진 등록 및 공개"}
              </button>
            </form>
          </>
        )}
      </details>
      <Dialog
        open={Boolean(previewPhoto)}
        onOpenChange={open => !open && setPreviewPhoto(null)}
      >
        {previewPhoto && (
          <DialogContent
            className="photo-lightbox"
            aria-describedby="photo-lightbox-description"
          >
            <DialogTitle>활동 사진 미리보기</DialogTitle>
            <DialogDescription id="photo-lightbox-description">
              {previewPhoto.caption}
            </DialogDescription>
            <img
              src={previewPhoto.imageUrl}
              alt={previewPhoto.caption}
              width={previewPhoto.width}
              height={previewPhoto.height}
            />
            <div className="photo-lightbox-actions">
              <button
                type="button"
                disabled={
                  photos.findIndex(photo => photo.id === previewPhoto.id) <= 0
                }
                onClick={() => {
                  const index = photos.findIndex(
                    photo => photo.id === previewPhoto.id
                  );
                  if (index > 0) setPreviewPhoto(photos[index - 1]);
                }}
              >
                이전 사진
              </button>
              <a
                href={previewPhoto.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                새 탭에서 원본 보기
              </a>
              <button
                type="button"
                disabled={
                  photos.findIndex(photo => photo.id === previewPhoto.id) < 0 ||
                  photos.findIndex(photo => photo.id === previewPhoto.id) >=
                    photos.length - 1
                }
                onClick={() => {
                  const index = photos.findIndex(
                    photo => photo.id === previewPhoto.id
                  );
                  if (index >= 0 && index < photos.length - 1)
                    setPreviewPhoto(photos[index + 1]);
                }}
              >
                다음 사진
              </button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </section>
  );
}
