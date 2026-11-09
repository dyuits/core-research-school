import { Download, FileText } from "lucide-react";
import type { CoreProgram } from "@/data/corePrograms";
import { pdfMaterials } from "@/data/pdfMaterials";
import { reportSessions } from "@/data/reportSessions";

export default function ProgramMaterials({
  program,
}: {
  program: CoreProgram;
}) {
  const files = pdfMaterials.filter(f => f.programId === program.id);
  const sessions = reportSessions.filter(s => s.programId === program.id);
  return (
    <div className="program-materials">
      <div className="materials-heading">
        <div>
          <h3>교수·학습 자료 PDF</h3>
          <p>
            {program.sessions} · {files.length}개 자료
          </p>
        </div>
        <FileText aria-hidden="true" size={28} />
      </div>
      <p className="materials-notice">
        제공된 HWPX 원본을 PDF로 변환한 자료입니다. 지도안과 학생 활동지를
        프로그램 단위로 내려받을 수 있습니다.
      </p>
      <div className="pdf-file-list">
        {files.map(file => (
          <article key={file.file}>
            <div>
              <small>
                {file.category} · {file.sessionRange}차시 통합 자료
              </small>
              <h4>{file.name}</h4>
              <p>
                PDF · {(file.size / 1024 / 1024).toFixed(2)} MB · 등록일 2026.
                11. 9.
              </p>
            </div>
            <a
              href={`${import.meta.env.BASE_URL}materials/${file.file}`}
              download={file.name}
            >
              <Download size={17} aria-hidden="true" />
              PDF 다운로드<span className="sr-only">: {file.name}</span>
            </a>
          </article>
        ))}
      </div>
      <section className="source-session-list" aria-label="차시별 학습 내용">
        <h3>차시별 학습 내용</h3>
        <p>
          연구보고서 표 Ⅵ-4의 전체 차시 번호입니다. 상세 활동·평가 기준은 위
          PDF에서 확인하세요.
        </p>
        {sessions.map(session => (
          <details key={session.number}>
            <summary>
              {session.number}차시 · {session.title.replace(/^⦁\s*/, "")}
            </summary>
            <div>
              {session.goals && (
                <>
                  <h4>학습 목표</h4>
                  <p>{session.goals}</p>
                </>
              )}
              {session.standards && (
                <>
                  <h4>관련 성취기준</h4>
                  <p>{session.standards}</p>
                </>
              )}
              {session.activities && (
                <>
                  <h4>주요 학습</h4>
                  <p>{session.activities}</p>
                </>
              )}
              <p className="materials-notice">{session.note}</p>
            </div>
          </details>
        ))}
      </section>
      <p className="materials-source">
        출처: ver25 연구보고서 표 Ⅵ-4(p.29–31), 부록 8 및 제공된 수업지도안
        폴더. 영어Ⅱ·윤리와 사상 자료는 공개수업 중심의 과정안과 평가자료를
        포함합니다.
      </p>
    </div>
  );
}
