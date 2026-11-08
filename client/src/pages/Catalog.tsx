import { useEffect, useState, type FormEvent } from "react";
import {
  definitions,
  recordCategories,
  resourceCategories,
  attachmentCategories,
  type Entry,
  type Kind,
  type Attachment,
} from "@shared/catalog";
import "./catalog.css";

async function api<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${url}`, {
    ...init,
    headers: {
      "X-School-Request": "1",
      ...(init.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...init.headers,
    },
  });
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw new Error(
      "자료 관리 서버에 연결할 수 없습니다. GitHub Pages에서는 기존 아카이브만 제공됩니다. 관리자용 Node 서버 배포가 필요합니다."
    );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "요청에 실패했습니다.");
  return data;
}
function route(kind: Kind, id?: string) {
  window.location.hash = `catalog/${kind}${id ? `/${id}` : ""}`;
}
async function options(kind: Kind) {
  let rows: Entry[] = [];
  let total = 1;
  while (rows.length < total) {
    const page = await api<{ items: Entry[]; total: number }>(
      `/entries?kind=${kind}&offset=${rows.length}`
    );
    rows = rows.concat(page.items);
    total = page.total;
  }
  return rows;
}
const fresh = (kind: Kind, programId: string | null = null): Entry => ({
  id: crypto.randomUUID(),
  kind,
  title: "",
  data: {},
  programId,
  sessionId: null,
  position: 1,
  anonymized: false,
  status: "draft",
  updatedAt: "",
});
export default function Catalog({ location }: { location: string }) {
  const [, rawKind, id] = location.slice(1).split("/");
  const kind: Kind = rawKind in definitions ? (rawKind as Kind) : "programs";
  const [admin, setAdmin] = useState(false);
  const [rows, setRows] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Entry | null>(null);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [programs, setPrograms] = useState<Entry[]>([]);
  const [sessions, setSessions] = useState<Entry[]>([]);
  const [related, setRelated] = useState<Entry[]>([]);
  const [files, setFiles] = useState<Attachment[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const [fileCategory, setFileCategory] = useState(attachmentCategories[0]);
  const [connected, setConnected] = useState(false);
  const refresh = () => setVersion(v => v + 1);
  useEffect(() => {
    let alive = true;
    api<{ admin: boolean }>("/auth")
      .then(x => {
        if (alive) {
          setAdmin(x.admin);
          setConnected(true);
        }
      })
      .catch(e => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [version]);
  useEffect(() => {
    setQuery("");
    setCategory("");
  }, [kind]);
  useEffect(() => {
    let alive = true;
    setEditing(null);
    setSelected(null);
    setFiles([]);
    setRelated([]);
    setError("");
    const run = async () => {
      const [p, s] = await Promise.all([
        options("programs"),
        options("sessions"),
      ]);
      if (!alive) return;
      setPrograms(p);
      setSessions(s);
      if (id) {
        const e = await api<Entry>(`/entries/${encodeURIComponent(id)}`);
        const f = await api<Attachment[]>(`/entries/${e.id}/attachments`);
        if (!alive) return;
        setSelected(e);
        setFiles(f);
        let relatedRows: Entry[] = [];
        let relatedTotal = 1;
        while (relatedRows.length < relatedTotal) {
          const r = await api<{ items: Entry[]; total: number }>(
            `/entries?${e.kind === "programs" ? "programId" : "sessionId"}=${e.id}&offset=${relatedRows.length}`
          );
          relatedRows = relatedRows.concat(r.items);
          relatedTotal = r.total;
        }
        if (alive) setRelated(relatedRows);
      } else {
        const r = await api<{ items: Entry[]; total: number }>(
          `/entries?kind=${kind}&q=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}`
        );
        if (alive) {
          setRows(r.items);
          setTotal(r.total);
        }
      }
    };
    run().catch(e => {
      if (alive) setError(e.message);
    });
    return () => {
      alive = false;
    };
  }, [kind, id, query, category, version]);
  async function perform(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    await perform(async () => {
      const { kind, status, programId, sessionId, position, anonymized, data } =
        editing;
      await api(`/entries/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify({
          kind,
          status,
          programId,
          sessionId,
          position,
          anonymized,
          data,
        }),
      });
      setEditing(null);
      route(kind, editing.id);
      refresh();
      setNotice("저장했습니다.");
    });
  }
  const categories =
    kind === "records"
      ? recordCategories
      : kind === "resources"
        ? resourceCategories
        : [];
  const program = selected?.programId
    ? programs.find(p => p.id === selected.programId)
    : null;
  const siblingSessions = sessions
    .filter(s => s.programId === selected?.programId)
    .sort((a, b) => a.position - b.position);
  const index = siblingSessions.findIndex(s => s.id === selected?.id);
  return (
    <div className="catalog-page">
      <header className="simple-header">
        <a className="simple-brand" href="#top">
          <span>
            <strong>제주중앙고등학교</strong>
            <small>CORE 연구학교 · 수업 자료 관리</small>
          </span>
        </a>
        <a href="#lessons">기존 수업 아카이브</a>
      </header>
      <main className="content-width catalog-main">
        <nav className="catalog-nav" aria-label="자료 메뉴">
          {(Object.keys(definitions) as Kind[]).map(k => (
            <a
              key={k}
              href={`#catalog/${k}`}
              aria-current={k === kind ? "page" : undefined}
            >
              {definitions[k].label}
            </a>
          ))}
        </nav>
        <h1>{definitions[kind].label}</h1>
        <p>기존 CORE 자료와 연구보고서에 근거한 운영 자료를 등록·공유합니다.</p>
        {error && (
          <p role="alert" className="catalog-error">
            {error}
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
        {connected && (
          <details className="admin-login">
            <summary>관리자 {admin ? "관리" : "로그인"}</summary>
            {admin ? (
              <button
                disabled={busy}
                onClick={() =>
                  perform(async () => {
                    await api("/logout", { method: "POST" });
                    setAdmin(false);
                    setEditing(null);
                    refresh();
                  })
                }
              >
                로그아웃
              </button>
            ) : (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  const password = new FormData(e.currentTarget).get(
                    "password"
                  );
                  e.currentTarget.reset();
                  perform(async () => {
                    await api("/login", {
                      method: "POST",
                      body: JSON.stringify({ password }),
                    });
                    refresh();
                  });
                }}
              >
                <label>
                  관리자 암호
                  <input
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    required
                    maxLength={256}
                  />
                </label>
                <button disabled={busy}>로그인</button>
              </form>
            )}
          </details>
        )}
        {admin && !editing && (
          <button disabled={busy} onClick={() => setEditing(fresh(kind))}>
            새 {definitions[kind].label} 등록
          </button>
        )}
        {editing ? (
          <form className="catalog-editor" onSubmit={save}>
            <h2>{editing.updatedAt ? "수정" : "등록"}</h2>
            <label>
              공개 상태
              <select
                value={editing.status}
                onChange={e =>
                  setEditing({
                    ...editing,
                    status: e.target.value as Entry["status"],
                  })
                }
              >
                <option value="draft">임시저장</option>
                <option value="private">비공개</option>
                <option value="published">공개</option>
              </select>
            </label>
            {!["programs", "introduction"].includes(editing.kind) && (
              <>
                <label>
                  연결 프로그램
                  <select
                    required={["sessions", "records"].includes(editing.kind)}
                    value={editing.programId ?? ""}
                    onChange={e =>
                      setEditing({
                        ...editing,
                        programId: e.target.value || null,
                        sessionId: null,
                      })
                    }
                  >
                    <option value="">선택 안 함</option>
                    {programs.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </label>
                {editing.kind !== "sessions" && (
                  <label>
                    연결 차시
                    <select
                      required={editing.kind === "records"}
                      value={editing.sessionId ?? ""}
                      onChange={e =>
                        setEditing({
                          ...editing,
                          sessionId: e.target.value || null,
                        })
                      }
                    >
                      <option value="">선택 안 함</option>
                      {sessions
                        .filter(s => s.programId === editing.programId)
                        .map(s => (
                          <option key={s.id} value={s.id}>
                            {s.position}차시 · {s.title}
                          </option>
                        ))}
                    </select>
                  </label>
                )}
              </>
            )}
            <label>
              {editing.kind === "sessions"
                ? "차시 순서 (숫자를 바꾸면 목록 순서가 변경됩니다)"
                : "목록 순서"}
              <input
                type="number"
                min={0}
                max={100000}
                required
                value={editing.position}
                onChange={e =>
                  setEditing({ ...editing, position: Number(e.target.value) })
                }
              />
            </label>
            {Object.entries(definitions[editing.kind].fields).map(
              ([field, label]) => (
                <label key={field}>
                  {label}
                  {field === "title" ? " *" : ""}
                  {field === "category" && categories.length ? (
                    <select
                      required
                      value={editing.data[field] ?? ""}
                      onChange={e =>
                        setEditing({
                          ...editing,
                          data: { ...editing.data, [field]: e.target.value },
                        })
                      }
                    >
                      <option value="">분류 선택</option>
                      {categories.map(c => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  ) : (
                    <textarea
                      required={field === "title"}
                      maxLength={20000}
                      rows={field === "title" ? 1 : 3}
                      value={editing.data[field] ?? ""}
                      onChange={e =>
                        setEditing({
                          ...editing,
                          data: { ...editing.data, [field]: e.target.value },
                        })
                      }
                    />
                  )}
                </label>
              )
            )}
            {["records", "assessments"].includes(editing.kind) && (
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={editing.anonymized}
                  onChange={e =>
                    setEditing({ ...editing, anonymized: e.target.checked })
                  }
                />
                성명·학번·사진·파일 내용 등 식별 정보를 제거했음을 확인했습니다.
                공개하려면 반드시 확인하세요.
              </label>
            )}
            <p>
              내용을 저장한 다음 상세 화면에서 첨부파일을 여러 개 업로드할 수
              있습니다.
            </p>
            <button disabled={busy}>저장</button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditing(null)}
            >
              취소
            </button>
          </form>
        ) : selected ? (
          <article className="catalog-detail">
            <a href={`#catalog/${selected.kind}`}>목록으로</a>
            <h2>
              {selected.kind === "sessions"
                ? `${selected.position}차시 · `
                : ""}
              {selected.title}
            </h2>
            {admin && (
              <p>
                상태:{" "}
                {selected.status === "published"
                  ? "공개"
                  : selected.status === "draft"
                    ? "임시저장"
                    : "비공개"}
              </p>
            )}
            {program && (
              <p>
                연결 프로그램:{" "}
                <a href={`#catalog/programs/${program.id}`}>{program.title}</a>
              </p>
            )}
            {selected.sessionId && (
              <p>
                <a href={`#catalog/sessions/${selected.sessionId}`}>
                  연결된 차시 보기
                </a>
              </p>
            )}
            {selected.kind === "records" && (
              <p className="catalog-notice">
                생활기록부 기재 예시입니다. 실제 학생 기록이 아니며 교사가
                확인한 활동 근거에 맞게 검토해야 합니다.
              </p>
            )}
            <dl>
              {Object.entries(definitions[selected.kind].fields)
                .filter(([key]) => key !== "title")
                .map(([key, label]) => (
                  <div key={key}>
                    <dt>{label}</dt>
                    <dd>{selected.data[key] || "등록된 내용이 없습니다."}</dd>
                  </div>
                ))}
            </dl>
            {admin && (
              <div className="catalog-actions">
                <button
                  disabled={busy}
                  onClick={() => setEditing(structuredClone(selected))}
                >
                  내용·차시 순서 수정
                </button>
                <button
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        "이 자료를 삭제하시겠습니까? 연결된 자료가 있으면 삭제되지 않습니다."
                      )
                    )
                      perform(async () => {
                        await api(`/entries/${selected.id}`, {
                          method: "DELETE",
                        });
                        route(selected.kind);
                        refresh();
                      });
                  }}
                >
                  삭제
                </button>
                {selected.kind === "programs" && (
                  <button
                    onClick={() => setEditing(fresh("sessions", selected.id))}
                  >
                    이 프로그램에 차시 추가
                  </button>
                )}
              </div>
            )}
            {["programs", "sessions"].includes(selected.kind) && (
              <section>
                <h3>
                  {selected.kind === "programs"
                    ? "차시·연계 자료"
                    : "평가·성장 및 기재 예시"}
                </h3>
                {related.length ? (
                  related.map(r => (
                    <p key={r.id}>
                      <a href={`#catalog/${r.kind}/${r.id}`}>
                        {r.kind === "sessions"
                          ? `${r.position}차시 · `
                          : `${definitions[r.kind].label} · `}
                        {r.title}
                      </a>
                    </p>
                  ))
                ) : (
                  <p>등록된 자료가 없습니다.</p>
                )}
              </section>
            )}
            <section>
              <h3>첨부자료</h3>
              {files.length ? (
                files.map(f => (
                  <div className="attachment-row" key={f.id}>
                    <div>
                      <b>{f.name}</b>
                      <p>
                        {f.category} · {f.format.toUpperCase()} ·{" "}
                        {(f.size / 1024).toFixed(1)}KB ·{" "}
                        {new Date(f.uploadedAt).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                    <a href={`/api/attachments/${f.id}/download`}>
                      원본 다운로드
                    </a>
                    {admin && (
                      <button
                        disabled={busy}
                        onClick={() => {
                          if (window.confirm("첨부파일을 삭제하시겠습니까?"))
                            perform(async () => {
                              await api(`/attachments/${f.id}`, {
                                method: "DELETE",
                              });
                              refresh();
                            });
                        }}
                      >
                        삭제
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p>등록된 자료가 없습니다</p>
              )}
              {admin && (
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const data = new FormData(form);
                    const uploadTarget = String(
                      data.get("targetId") || selected.id
                    );
                    const picked = data
                      .getAll("file")
                      .filter(
                        (f): f is File => f instanceof File && f.size > 0
                      );
                    perform(async () => {
                      for (const file of picked) {
                        const body = new FormData();
                        body.set("category", String(data.get("category")));
                        body.set(
                          "anonymized",
                          data.get("anonymized") === "on" ? "true" : "false"
                        );
                        body.set("file", file);
                        await api(`/entries/${uploadTarget}/attachments`, {
                          method: "POST",
                          body,
                        });
                      }
                      form.reset();
                      refresh();
                      setNotice(
                        "업로드했습니다. 기존 파일 교체 시 새 파일을 확인한 뒤 기존 파일을 삭제하세요."
                      );
                    });
                  }}
                >
                  <p>
                    파일을 선택한 다음 연결할 프로그램·차시를 지정하세요. 파일당
                    최대 25MB.
                  </p>
                  <label>
                    자료 유형
                    <select
                      name="category"
                      value={fileCategory}
                      onChange={e =>
                        setFileCategory(e.target.value as typeof fileCategory)
                      }
                    >
                      {attachmentCategories.map(c => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  {["records", "assessments"].includes(selected.kind) &&
                    selected.status === "published" && (
                      <label className="check-label">
                        <input name="anonymized" type="checkbox" required />
                        업로드할 모든 파일의 개인정보 비식별화를 확인했습니다.
                      </label>
                    )}
                  <label>
                    첨부파일 (복수 선택 가능)
                    <input
                      name="file"
                      type="file"
                      multiple
                      required
                      accept=".hwp,.hwpx,.pdf,.docx,.pptx,.xlsx,.png,.jpg,.jpeg,.zip"
                    />
                  </label>
                  <label>
                    파일 연결 위치
                    <select name="targetId" defaultValue={selected.id}>
                      <option value={selected.id}>
                        현재 자료 · {selected.title}
                      </option>
                      {programs.map(p => (
                        <optgroup key={p.id} label={p.title}>
                          <option value={p.id}>프로그램 공통자료</option>
                          {sessions
                            .filter(s => s.programId === p.id)
                            .map(s => (
                              <option key={s.id} value={s.id}>
                                {s.position}차시 · {s.title}
                              </option>
                            ))}
                        </optgroup>
                      ))}
                    </select>
                  </label>
                  <button disabled={busy}>
                    {busy ? "처리 중…" : "파일 업로드"}
                  </button>
                </form>
              )}
            </section>
            {selected.kind === "sessions" && (
              <nav className="catalog-actions" aria-label="차시 이동">
                {index > 0 && (
                  <a
                    href={`#catalog/sessions/${siblingSessions[index - 1].id}`}
                  >
                    ← 이전 차시
                  </a>
                )}
                {index >= 0 && index < siblingSessions.length - 1 && (
                  <a
                    href={`#catalog/sessions/${siblingSessions[index + 1].id}`}
                  >
                    다음 차시 →
                  </a>
                )}
              </nav>
            )}
          </article>
        ) : (
          <>
            <form
              className="catalog-search"
              onSubmit={e => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                setQuery(String(data.get("q") ?? ""));
                setCategory(String(data.get("category") ?? ""));
              }}
            >
              <label>
                검색
                <input
                  name="q"
                  type="search"
                  placeholder="제목·교과·도구·본문"
                />
              </label>
              {categories.length > 0 && (
                <label>
                  분류
                  <select name="category">
                    <option value="">전체</option>
                    {categories.map(c => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
              )}
              <button>검색</button>
            </form>
            <p>{total}개 자료</p>
            <div className="catalog-grid">
              {rows.map(r => (
                <a
                  key={r.id}
                  className="catalog-card"
                  href={`#catalog/${r.kind}/${r.id}`}
                >
                  <small>
                    {r.data.subject ||
                      r.data.category ||
                      definitions[r.kind].label}
                    {admin ? ` · ${r.status}` : ""}
                  </small>
                  <h2>
                    {r.kind === "sessions" ? `${r.position}차시 · ` : ""}
                    {r.title}
                  </h2>
                  <p>
                    {(r.data.description || r.data.goals || "").slice(0, 160)}
                  </p>
                </a>
              ))}
            </div>
            {!rows.length && !error && (
              <p>
                등록된 자료가 없습니다. 실제 연구자료 확인 후 관리자가
                등록합니다.
              </p>
            )}
            {rows.length < total && (
              <button
                disabled={busy}
                onClick={() =>
                  perform(async () => {
                    const r = await api<{ items: Entry[] }>(
                      `/entries?kind=${kind}&q=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}&offset=${rows.length}`
                    );
                    setRows([...rows, ...r.items]);
                  })
                }
              >
                더 보기
              </button>
            )}
          </>
        )}
      </main>
    </div>
  );
}
