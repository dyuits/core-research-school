import { upload } from "@vercel/blob/client";
import { lazy, Suspense, useEffect, useState, type FormEvent } from "react";
import FileDropzone from "./FileDropzone";
import type { CoreProgram } from "@/data/corePrograms";
import { mediaSessionsFor } from "@/data/mediaSessions";
import { isFestivalProgram } from "@/data/festivalPrograms";
const PdfPreview = lazy(() => import("./PdfPreview"));
const tokenKey = "core-photo-admin-session";
type Slide = {
  id: string;
  name: string;
  caption: string;
  ext: string;
  size: number;
  createdAt: string;
  downloadUrl: string;
};
type Page = { items: Slide[]; cursor: string | null; hasMore: boolean };
export default function LessonSlides({ program }: { program: CoreProgram }) {
  const sessions = mediaSessionsFor(program);
  const festival = isFestivalProgram(program);
  const activityLabel = festival ? "축제 활동" : "수업 차시";
  const [session, setSession] = useState(sessions[0]?.number ?? 1);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [endpoint, setEndpoint] = useState("");
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState(() => {
    try {
      return sessionStorage.getItem(tokenKey) || "";
    } catch {
      return "";
    }
  });
  const [page, setPage] = useState<Page>({
    items: [],
    cursor: null,
    hasMore: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [version, setVersion] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  function remember(value: string) {
    setToken(value);
    try {
      value
        ? sessionStorage.setItem(tokenKey, value)
        : sessionStorage.removeItem(tokenKey);
    } catch {
      /* Current tab can retain login in memory. */
    }
  }
  async function request<T>(url: string, init?: RequestInit): Promise<T> {
    const r = await fetch(url, init);
    const data = await r.json();
    if (r.status === 401) remember("");
    if (!r.ok) throw new Error(data.error || "요청에 실패했습니다.");
    return data;
  }
  useEffect(() => {
    let alive = true;
    fetch(`${import.meta.env.BASE_URL}photo-service.json`)
      .then(r => r.json())
      .then(async c => {
        const u = new URL(c.endpoint);
        if (u.protocol !== "https:") throw new Error();
        const r = await fetch(`${u}?action=status`);
        const s = await r.json();
        if (!r.ok) throw new Error();
        if (alive) {
          setEndpoint(u.toString());
          setReady(s.ready === true);
        }
      })
      .catch(() => {
        if (alive) setError("관리 서버에 연결하지 못했습니다.");
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!endpoint || !ready) return;
    let alive = true;
    setPage({ items: [], cursor: null, hasMore: false });
    setPreviewId(null);
    const u = new URL(endpoint);
    u.search = new URLSearchParams({
      action: "slides",
      programId: program.id,
      session: String(session),
    }).toString();
    fetch(u)
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        return d as Page;
      })
      .then(p => {
        if (alive) {
          setPage(p);
          setPreviewId(p.items[0]?.id ?? null);
        }
      })
      .catch(e => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [endpoint, ready, program.id, session, version]);
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
  function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const password = new FormData(form).get("password");
    form.reset();
    void run(async () => {
      const result = await request<{ token: string }>(
        `${endpoint}?action=login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        }
      );
      remember(result.token);
      setNotice("관리자로 로그인했습니다.");
    });
  }
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const files = [...selectedFiles];
    void run(async () => {
      if (!ready) throw new Error("파일 저장소 연결이 필요합니다.");
      if (!files.length) throw new Error("PPT·PPTX·PDF 파일을 선택하세요.");
      for (const file of files) {
        if (
          !/\.(ppt|pptx|pdf)$/i.test(file.name) ||
          file.size > 50 * 1024 * 1024
        )
          throw new Error("파일당 50MB 이하의 PPT·PPTX·PDF를 선택하세요.");
      }
      let completed = 0;
      try {
        for (const file of files) {
          const ext = file.name.split(".").pop()!.toLowerCase();
          const id = crypto.randomUUID();
          const meta = {
            programId: program.id,
            session,
            id,
            ext,
            name: file.name,
            caption: String(data.get("caption") || ""),
            privacyConfirmed: data.get("privacy") === "on",
          };
          await upload(`slides/${program.id}/${session}/${id}.${ext}`, file, {
            access: "private",
            handleUploadUrl: `${endpoint}?action=slide-upload`,
            headers: { Authorization: `Bearer ${token}` },
            clientPayload: JSON.stringify(meta),
            contentType:
              ext === "pdf"
                ? "application/pdf"
                : ext === "ppt"
                  ? "application/vnd.ms-powerpoint"
                  : "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            multipart: true,
          });
          await request(`${endpoint}?action=slide-finalize`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(meta),
          });
          setSelectedFiles(previous =>
            previous.filter(selected => selected !== file)
          );
          completed++;
          setNotice(`${completed}/${files.length}개 공개 완료`);
        }
        form.reset();
        setSelectedFiles([]);
        setNotice(
          `${completed}개 자료를 공개했습니다. 다른 선생님도 원본을 다운로드할 수 있습니다.`
        );
      } finally {
        setVersion(v => v + 1);
      }
    });
  }
  return (
    <section className="lesson-photos" aria-label="차시별 수업 PPT">
      <h3>{festival ? "축제 활동 PPT" : "차시별 수업 PPT"}</h3>
      <p>공개한 PPT·PPTX·PDF는 로그인 없이 원본을 다운로드할 수 있습니다.</p>
      <label className="photo-session-label">
        {activityLabel}
        <select
          value={session}
          disabled={busy}
          onChange={e => {
            setSession(Number(e.target.value));
            setPreviewId(null);
            setError("");
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
      {endpoint && !ready && (
        <p className="photo-error">
          관리자 로그인은 가능합니다. PPT 등록·공유는 파일 저장소 연결 후 사용할
          수 있습니다.
        </p>
      )}
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
      <h4>{festival ? program.title : `${session}차시`} 공개 자료</h4>
      {!page.items.length && (
        <p className="photo-empty">등록된 자료가 없습니다.</p>
      )}
      <ul className="slide-list">
        {page.items.map(s => (
          <li key={s.id}>
            <div>
              <strong>{s.name}</strong>
              <p>{s.caption}</p>
              <small>
                {s.ext.toUpperCase()} · {(s.size / 1024 / 1024).toFixed(2)} MB ·{" "}
                {new Date(s.createdAt).toLocaleDateString("ko-KR")}
              </small>
            </div>
            <button
              type="button"
              aria-expanded={previewId === s.id}
              aria-controls={`slide-preview-${s.id}`}
              onClick={() =>
                setPreviewId(previous => (previous === s.id ? null : s.id))
              }
            >
              {previewId === s.id
                ? "미리보기 닫기"
                : s.ext === "pdf"
                  ? "PDF 미리보기"
                  : "PPT 미리보기"}
            </button>
            <a className="slide-download" href={s.downloadUrl}>
              원본 다운로드
            </a>
            {token && (
              <button
                disabled={busy}
                onClick={() => {
                  if (!confirm("이 자료의 공개를 취소할까요?")) return;
                  void run(async () => {
                    const u = new URL(s.downloadUrl);
                    await request(u.toString(), {
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
            {previewId === s.id && (
              <section
                className="slide-preview"
                id={`slide-preview-${s.id}`}
                aria-label={`${s.name} 미리보기`}
              >
                {s.ext === "pdf" ? (
                  <>
                    <Suspense
                      fallback={<p role="status">PDF를 불러오는 중입니다.</p>}
                    >
                      <PdfPreview
                        key={s.id}
                        url={s.downloadUrl}
                        title={s.name}
                      />
                    </Suspense>
                    <a
                      href={s.downloadUrl + "&preview=1"}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      새 탭에서 보기
                    </a>
                  </>
                ) : (
                  <>
                    <p>
                      Microsoft 웹 뷰어로 공개 자료를 표시합니다. 아래 화면에서
                      슬라이드를 넘기거나 전체 화면으로 볼 수 있습니다.
                    </p>
                    <iframe
                      title={`${s.name} 슬라이드 미리보기`}
                      src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(s.downloadUrl)}`}
                      allowFullScreen
                      referrerPolicy="no-referrer"
                    />
                    <p>
                      미리보기가 표시되지 않으면{" "}
                      <a
                        href={`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(s.downloadUrl)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        새 창에서 미리보기
                      </a>{" "}
                      또는 원본 다운로드를 이용하세요. 글꼴·애니메이션은 원본과
                      다를 수 있습니다.
                    </p>
                  </>
                )}
              </section>
            )}
          </li>
        ))}
      </ul>
      {page.hasMore && (
        <button
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const u = new URL(endpoint);
              u.search = new URLSearchParams({
                action: "slides",
                programId: program.id,
                session: String(session),
                cursor: page.cursor || "",
              }).toString();
              const p = await request<Page>(u.toString());
              setPage(previous => ({
                ...p,
                items: [...previous.items, ...p.items],
              }));
            })
          }
        >
          자료 더 보기
        </button>
      )}
      <details className="photo-admin">
        <summary>관리자 로그인 · 자료 등록</summary>
        {!token ? (
          <form onSubmit={login}>
            <label>
              관리자 암호
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                maxLength={128}
              />
            </label>
            <button disabled={busy || !endpoint}>관리자 로그인</button>
          </form>
        ) : (
          <>
            <button disabled={busy} onClick={() => remember("")}>
              로그아웃
            </button>
            <form onSubmit={submit}>
              <p>
                <b>
                  {program.title}
                  {!festival && ` · ${session}차시`}
                </b>
                에 등록합니다.
              </p>
              <label>
                자료 설명
                <input name="caption" maxLength={500} />
              </label>
              <FileDropzone
                kind="slides"
                files={selectedFiles}
                onChange={setSelectedFiles}
                disabled={busy}
              />
              <p>
                PPT·PPTX·PDF, 파일당 50MB 이하. 매크로 자료는 지원하지 않습니다.
                원본 파일 그대로 공개됩니다.
              </p>
              <label className="photo-privacy">
                <input type="checkbox" name="privacy" required />
                학생 식별 정보를 제거했고, 자료 공개에 필요한 저작권·동의를
                확인했습니다.
              </label>
              <button disabled={busy || !ready || !selectedFiles.length}>
                {busy
                  ? "업로드 및 파일 검증 중…"
                  : `자료 ${selectedFiles.length}개 등록 및 공개`}
              </button>
            </form>
          </>
        )}
      </details>
    </section>
  );
}
