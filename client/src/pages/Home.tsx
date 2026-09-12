/**
 * Design: 간결한 수업 아카이브 — 상단에서 CORE의 뜻을 먼저 이해하고, 한 페이지에서 차시·활동·기록을 읽는다.
 * 시각 장식을 절제하고 수업 정보·생활기록부 작성 근거의 가독성을 최우선으로 둔다.
 */
import { useMemo, useState } from "react";
import { Check, ChevronRight, ClipboardCheck, Copy, Eye, MessageCircleQuestion, Target, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { corePillars, corePrograms, type CoreProgram } from "@/data/corePrograms";
import { lessonGuides } from "@/data/lessonGuides";
import { recordExamplesByProgram, type GradeLevel } from "@/data/recordExamples";
import { lessonSelFocus } from "@/data/socialEmotional";

type ModalTab = "overview" | "core" | "record";
type ProgramGroup = "창체" | "교과";

const isCreativeProgram = (program: CoreProgram) => program.track !== "교과";

function TrackPill({ program }: { program: CoreProgram }) {
  const isCreative = isCreativeProgram(program);
  return <span className={`track-pill ${isCreative ? "creative" : "subject"}`}>{isCreative ? "창체" : "교과"}</span>;
}

function RecordGuide({ program, copied, activeGrade, onGradeChange, onCopy }: { program: CoreProgram; copied: boolean; activeGrade: GradeLevel; onGradeChange: (grade: GradeLevel) => void; onCopy: (text: string) => void }) {
  const isCreative = isCreativeProgram(program);
  const isCareer = program.subject.includes("진로");
  const recordArea = isCreative ? (isCareer ? "진로활동 특기사항" : "행동특성·자율활동 관찰 참고") : "교과세부능력 및 특기사항";
  const gradeExamples = recordExamplesByProgram[program.id] ?? [];
  const selectedExample = gradeExamples.find((example) => example.grade === activeGrade);
  const exampleText = selectedExample?.text ?? program.recordExample ?? "해당 차시의 실제 관찰 장면과 산출물을 확인한 뒤, 수업의 맥락–과정–변화를 연결하여 기재합니다.";
  const guide = isCreative
    ? [
        ["사회정서 관찰", isCareer ? "진로 관심과 가치 탐색, 질문 생성, 탐구의 확장 과정을 포착한다." : "참여 장면, 관계·정서의 변화, 디지털 도구 활용 과정과 산출물을 포착한다."],
        ["문장 흐름", "강점과 역량을 먼저 제시한 뒤, 활동의 구체적 과정과 변화의 근거를 연결한다."],
        ["기재 유의", "단순 활동 나열·감정적 수식은 피하고, 실제 관찰·산출물·발언에 맞게 수정한다."],
      ]
    : [
        ["사회정서 연계", "성취기준을 그대로 옮기지 않고, 해당 차시에서 학생이 다룬 감정·관계·공동체 문제 상황을 드러낸다."],
        ["과정 근거", "자료 탐색, 비교·분석, 질문, 피드백 수용, 수정 등 수업 중 확인된 사고 과정을 연결한다."],
        ["기재 유의", "활동명 나열이나 결과만의 평가는 피하고, 교과 역량이 드러나는 산출물·발표·기록을 근거로 쓴다."],
      ];

  return (
    <div className="record-tab-content">
      <div className="record-area-label"><ClipboardCheck size={17} /><span>{recordArea} 작성 방법</span></div>
      <div className="guide-grid">
        {guide.map(([title, description]) => <div className="guide-item" key={title}><b>{title}</b><p>{description}</p></div>)}
      </div>
      <div className="grade-record-picker" aria-label="학년별 생활기록부 기재 예시">
        <div className="grade-record-picker-heading"><div><span>학년별 활동 기반 예시</span><b>학생의 실제 활동 증거에 가까운 학년을 선택해요.</b></div><span className="grade-record-type">{isCreative ? "창체 기록" : "교과세특"}</span></div>
        <div className="grade-record-tabs" role="tablist" aria-label="학년 선택">{(["1학년", "2학년", "3학년"] as GradeLevel[]).map((grade) => <button key={grade} className={activeGrade === grade ? "active" : ""} onClick={() => onGradeChange(grade)} role="tab" aria-selected={activeGrade === grade}>{grade}</button>)}</div>
      </div>
      <div className="record-example-box grade-record-example">
        <div className="record-example-heading"><span>{activeGrade} · {selectedExample?.focus ?? "활동 기반 기재 예시"}</span><button onClick={() => onCopy(exampleText)}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "복사됨" : "문장 복사"}</button></div>
        {selectedExample && <p className="record-competencies"><b>핵심역량의 행동 근거</b><span>{selectedExample.competencies}</span></p>}
        <p>{exampleText}</p>
      </div>
      <p className="record-notice">※ 예시는 수업 활동·산출물에 기반한 검토용 문장입니다. 실제 생활기록부에는 교사가 확인한 활동지·발언·산출물·피드백 기록에 맞게 표현과 내용을 조정해 주세요.</p>
    </div>
  );
}

export default function Home() {
  const [activeGroup, setActiveGroup] = useState<ProgramGroup>("창체");
  const [activeProgram, setActiveProgram] = useState<CoreProgram | null>(null);
  const [modalTab, setModalTab] = useState<ModalTab>("core");
  const [activeStep, setActiveStep] = useState<"C" | "O" | "R" | "E">("C");
  const [recordGrade, setRecordGrade] = useState<GradeLevel>("1학년");
  const [copied, setCopied] = useState(false);

  const displayedPrograms = useMemo(() => corePrograms.filter((program) => activeGroup === "교과" ? program.track === "교과" : program.track !== "교과"), [activeGroup]);
  const currentStep = activeProgram?.steps.find((step) => step.key === activeStep);
  const currentGuide = activeProgram ? lessonGuides[activeProgram.id] ?? {
    opening: `${activeProgram.title} 활동을 시작하기 전에 나의 경험과 질문을 짧게 기록한다.`,
    teacherPrompt: activeProgram.steps.find((step) => step.key === "R")?.text ?? "이 활동을 통해 새롭게 발견한 생각은 무엇인가?",
    assessmentPoints: ["자신의 경험과 주제를 연결하는가", "자료·타인의 관점을 바탕으로 생각을 보완하는가", "활동 결과를 자신의 언어로 표현하는가"],
    evidence: activeProgram.output,
  } : null;

  const openProgram = (program: CoreProgram) => {
    setActiveProgram(program);
    setModalTab("overview");
    setActiveStep("C");
    setRecordGrade("1학년");
    setCopied(false);
  };

  const copyRecord = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="archive-page">
      <header className="simple-header">
        <a href="#top" className="simple-brand"><span><strong>제주중앙고등학교</strong><small>AI·디지털 기반 질문수용 CORE 연구학교</small></span></a>
        <nav><a href="#lessons">차시별 프로그램</a><a href="#record-guide">기록 작성 안내</a></nav>
      </header>

      <main id="top">
        <section className="compact-hero">
          <div className="hero-materials" aria-hidden="true"><i /><i /><span>JEJU COAST / FIELD NOTES</span></div>
          <div className="hero-inner">
            <p className="kicker">JEJU JUNGANG HIGH SCHOOL · 2026–2027</p>
            <h1>질문을 수용하고,<br /><em>생각을 표현하는 수업.</em></h1>
            <p>AI·디지털 기반 질문수용 CORE 프로그램으로 학생의 <b>사회정서 역량</b>과 <b>디지털 리터러시</b>를 함께 기르는 차시별 활동·기록 자료를 한 곳에 모았어.</p>
            <div className="hero-core-meaning" aria-label="CORE 프로그램의 뜻">
              <div className="hero-core-meaning-title"><span>CORE PROGRAM</span><b>질문을 따라 생각을 완성하는 4단계 학습 흐름</b></div>
              <p>나의 경험과 주제를 <strong>연결</strong>하고, 자료와 관점을 <strong>관찰</strong>한 뒤, 질문으로 <strong>성찰</strong>하여 나만의 언어로 <strong>표현</strong>하고 공유해.</p>
              <div className="hero-core-steps">{corePillars.map((pillar) => <div key={pillar.key}><b>{pillar.key}</b><span>{pillar.english}</span><em>{pillar.korean}</em></div>)}</div>
            </div>
            <a className="hero-link" href="#lessons">차시별 프로그램 보기 <ChevronRight size={17} /></a>
          </div>
        </section>

        <section id="lessons" className="lesson-section content-width">
          <div className="lesson-heading"><div><p className="kicker orange">LESSON ARCHIVE</p><h2>차시별 프로그램</h2><p>두 개의 수업 항로에서 원하는 차시를 선택하면, CORE 활동과 생활기록부 작성 참고 내용을 팝업에서 확인할 수 있어.</p></div><div className="group-tabs" role="tablist" aria-label="프로그램 항로 선택"><button className={activeGroup === "창체" ? "active" : ""} onClick={() => setActiveGroup("창체")}><span>01</span><div><b>창체 프로그램</b><small>관계 · 진로 · 자기이해</small></div></button><button className={activeGroup === "교과" ? "active" : ""} onClick={() => setActiveGroup("교과")}><span>02</span><div><b>교과수업 프로그램</b><small>탐구 · 분석 · 표현</small></div></button></div></div>

          <div className="lesson-grid">
            {displayedPrograms.map((program) => { const selFocus = lessonSelFocus[program.id]; return <button className={`lesson-card ${isCreativeProgram(program) ? "creative-card" : "subject-card"}`} onClick={() => openProgram(program)} key={program.id}><div className="lesson-card-top"><span className="lesson-number">{String(program.sequence).padStart(2, "0")}</span><TrackPill program={program} /></div><div className="lesson-card-title"><small>{program.subject}</small><b>{program.title}</b><p>{program.subtitle}</p></div><div className="lesson-sel-chip"><span>사회정서</span><b>{selFocus?.competency}</b></div><div className="card-core"><span>C</span><span>O</span><span>R</span><span>E</span></div><div className="lesson-card-bottom"><span>{program.sessions}</span><em>{program.output}</em><ChevronRight size={18} /></div></button>})}
          </div>
        </section>

        <section id="record-guide" className="record-guide-band">
          <div className="content-width record-guide-inner"><div><p className="kicker orange">RECORD WRITING GUIDE</p><h2>활동을 나열하지 않고,<br /><em>과정과 변화</em>를 기록합니다.</h2></div><p>창체는 학생의 참여·관계·진로 탐색 과정에, 교과는 성취기준과 연결된 탐구·분석·표현 과정에 초점을 두어 기록해. 각 차시 팝업의 <b>‘기록 작성’</b> 탭에서 작성 방법과 기재 예시를 확인할 수 있어.</p></div>
        </section>
      </main>

      <footer className="simple-footer"><div className="simple-brand footer-brand"><span><strong>제주중앙고등학교</strong><small>AI·디지털 기반 질문수용 CORE 연구학교</small></span></div><p>AI·디지털 기반 질문수용 「CORE」프로그램을 통한 학생 정서 회복 및 디지털 리터러시 신장</p></footer>

      <Dialog open={Boolean(activeProgram)} onOpenChange={(open) => !open && setActiveProgram(null)}>
        {activeProgram && <DialogContent className="lesson-dialog lesson-dialog--expanded" showCloseButton={false} aria-describedby="lesson-dialog-description">
          <div className="dialog-topbar"><div><TrackPill program={activeProgram} /><span>{activeProgram.sessions}</span></div><DialogClose className="dialog-close" aria-label="팝업 닫기"><X size={20} /></DialogClose></div>
          <div className="dialog-heading"><small>{activeProgram.subject}</small><DialogTitle>{activeProgram.title}</DialogTitle><DialogDescription id="lesson-dialog-description">{activeProgram.subtitle}</DialogDescription></div>
          <div className="dialog-tabs" role="tablist"><button className={modalTab === "overview" ? "active" : ""} onClick={() => setModalTab("overview")} role="tab" aria-selected={modalTab === "overview"}>수업 개요</button><button className={modalTab === "core" ? "active" : ""} onClick={() => setModalTab("core")} role="tab" aria-selected={modalTab === "core"}>CORE 활동</button><button className={modalTab === "record" ? "active" : ""} onClick={() => setModalTab("record")} role="tab" aria-selected={modalTab === "record"}>{isCreativeProgram(activeProgram) ? "창체 기록 작성" : "교과세특 작성"}</button></div>
          {modalTab === "overview" ? <div className="overview-tab-content"><div className="overview-top-grid"><section className="overview-goal"><Target size={20} /><div><span>수업 목표</span><p>{activeProgram.goal}</p></div></section><section className="overview-output"><Eye size={20} /><div><span>산출물·증거</span><p>{currentGuide?.evidence ?? activeProgram.output}</p></div></section></div><section className="teacher-question"><MessageCircleQuestion size={22} /><div><span>핵심 교사 발문</span><p>“{currentGuide?.teacherPrompt}”</p></div></section><div className="overview-activity-flow"><div className="overview-section-title"><b>차시 활동 흐름</b><span>활동 장면을 확인하고 기록 근거로 연결해요.</span></div>{activeProgram.steps.map((step) => <article key={step.key}><strong>{step.key}</strong><div><b>{step.label}</b><p>{step.text}</p></div></article>)}</div><div className="assessment-block"><div className="overview-section-title"><b>평가 관찰 포인트</b><span>수업 중 발언·기록·산출물에서 확인해요.</span></div><div>{currentGuide?.assessmentPoints.map((point, index) => <p key={point}><span>0{index + 1}</span>{point}</p>)}</div></div></div> : modalTab === "core" ? <div className="core-tab-content"><div className="core-step-tabs">{activeProgram.steps.map((step) => <button key={step.key} className={activeStep === step.key ? "active" : ""} onClick={() => setActiveStep(step.key)}><strong>{step.key}</strong><span>{step.label}</span></button>)}</div><div className="step-detail"><span>{currentStep?.key}</span><div><b>{currentStep?.label} · {corePillars.find((pillar) => pillar.key === currentStep?.key)?.korean}</b><p>{currentStep?.text}</p></div></div><div className="activity-meta"><div><span>수업 목표</span><p>{activeProgram.goal}</p></div><div><span>활용 도구</span><p>{activeProgram.tools.join(" · ")}</p></div><div><span>산출물</span><p>{activeProgram.output}</p></div></div></div> : <RecordGuide program={activeProgram} copied={copied} activeGrade={recordGrade} onGradeChange={setRecordGrade} onCopy={copyRecord} />}
        </DialogContent>}
      </Dialog>
    </div>
  );
}
