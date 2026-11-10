import { Root as Tabs, Content as TabsContent, List as TabsList, Trigger as TabsTrigger } from "@radix-ui/react-tabs";

const coreHeaders = ["단계", "교수·학습 활동", "질문수용원리", "AI 리터러시 연계", "수업 자료 예시"];
const coreRows = [
  ["Connect", "연결", "경험과 학습 주제를 연결하고 타인의 질문을 탐구 과제로 수용", "경청, 이해", "목적과 탐구 문제 인식", "학습지, 재진술·질문 기록"],
  ["Observe", "관찰", "AI·디지털 교육자료로 정보와 관점을 탐색·비교·분석", "탐구반영", "AI·디지털 정보의 특성 이해, 정보 탐색·분석", "디지털 게시글, 댓글 질문"],
  ["Reflect", "성찰", "정보의 타당성과 AI 생성 결과의 정확성·신뢰성을 검토하고 판단을 재구성", "탐구반영, 재구성", "정보의 정확성, 신뢰성에 대한 비판적 평가", "질문 변화 기록, AI 피드백 수용·거부 기록"],
  ["Express", "표현", "재구성한 생각을 표현·공유하고 새로운 질문을 후속 탐구로 연결", "재구성", "AI·디지털 도구의 책임 있는 활용과 표현·공유", "결과물 수정 전후, 동료 피드백"],
];
const subjectRows = [
  ["창의적 체험활동", "자기 이해와 독서 탐구, 뉴스 데이터 기반 사회 감정 분석, 미니 연구보고서 작성, 디지털 시대의 감정과 소통"],
  ["미술창작", "입체주의와 인간 창의성 탐구 → AI 생성 이미지 비교, 자신만의 미술 작품 창작"],
  ["생명과학", "제주 환경문제와 생물 다양성 탐구"],
  ["정보", "AI 정보의 신뢰성 판단, 개인정보 보호와 책임 있는 활용"],
  ["화법과 언어", "공동체 문제 탐구 → 설득적 표현을 통한 호소문 작성"],
  ["윤리와 사상", "윤리 사상가의 주장 탐구 → 음악을 활용한 사상 표현"],
  ["영어Ⅱ", "자신의 취미와 정체성을 영어로 표현 → AI 피드백의 선택적 반영, 발표와 소통"],
];

export default function ResearchTables() {
  return (
    <section id="research-tables" className="research-tables content-width" aria-labelledby="research-tables-title">
      <div className="research-tables-heading"><p className="kicker orange">CORE LEARNING FRAMEWORK</p><h2 id="research-tables-title">수업의 흐름과 배움의 연결</h2><p>CORE의 네 단계가 질문수용과 AI 리터러시로 이어지는 과정, 영역별 주요 학습 내용을 살펴보세요.</p></div>
      <Tabs defaultValue="core" className="research-tabs">
        <TabsList className="research-tab-list" aria-label="연구학교 수업 연계 자료">
          <TabsTrigger value="core">CORE 단계별 연계 구조</TabsTrigger>
          <TabsTrigger value="subjects">영역별 주요 학습 내용</TabsTrigger>
        </TabsList>
        <TabsContent value="core" className="research-panel">
          <div className="research-panel-heading"><span>01 / CORE FRAMEWORK</span><h3>연결에서 표현까지, 질문으로 이어지는 수업</h3><p>경험을 연결하고 정보를 관찰한 뒤, 비판적 성찰을 거쳐 자신의 생각을 표현합니다.</p></div>
          <div className="research-core-desktop"><table className="research-table research-core-table"><caption>&lt;표 Ⅵ-2&gt; CORE 단계별 연계 구조</caption><thead><tr>{coreHeaders.map(header => <th scope="col" key={header}>{header}</th>)}</tr></thead><tbody>{coreRows.map(([english, korean, ...cells]) => <tr key={english}><th scope="row"><span className={`research-step research-step-${english.toLowerCase()}`}>{english[0]}</span><b>{english}</b><small>({korean})</small></th>{cells.map((cell, index) => <td key={index}>{cell}</td>)}</tr>)}</tbody></table></div>
          <div className="research-core-mobile" aria-label="CORE 단계별 연계 구조">
            {coreRows.map(([english, korean, ...cells]) => <article key={english}><h4><span className={`research-step research-step-${english.toLowerCase()}`}>{english[0]}</span>{english} <small>({korean})</small></h4><dl>{cells.map((cell, index) => <div key={index}><dt>{coreHeaders[index + 1]}</dt><dd>{cell}</dd></div>)}</dl></article>)}
            <p className="research-caption">&lt;표 Ⅵ-2&gt; CORE 단계별 연계 구조</p>
          </div>
        </TabsContent>
        <TabsContent value="subjects" className="research-panel">
          <div className="research-panel-heading"><span>02 / LEARNING AREAS</span><h3>교과의 배움을 삶의 질문으로</h3><p>창의적 체험활동과 여섯 교과에서 탐구하고 표현하는 주요 학습 내용입니다.</p></div>
          <table className="research-table research-subject-table"><caption className="sr-only">영역별 주요 학습 내용</caption><thead><tr><th scope="col">영역</th><th scope="col">주요 학습 내용</th></tr></thead><tbody>{subjectRows.map(([subject, content], index) => <tr key={subject}><th scope="row"><span className="research-subject-number">{String(index + 1).padStart(2, "0")}</span>{subject}</th><td>{content}</td></tr>)}</tbody></table>
        </TabsContent>
      </Tabs>
    </section>
  );
}
