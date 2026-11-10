import { lessonSummaryHeaders, lessonSummaryRows } from "@/data/lessonSummary";

export default function LessonSummary() {
  return (
    <section className="lesson-summary" aria-label="차시별 요약">
      <h3>차시별 요약</h3>
      <p id="lesson-summary-help">1–22차시의 학습주제와 활동, AI·디지털 교육자료를 한눈에 확인하세요. 표를 좌우로 스크롤하면 모든 항목을 볼 수 있습니다.</p>
      <div className="lesson-summary-scroll" role="region" aria-label="차시별 프로그램 요약 표" aria-describedby="lesson-summary-help" tabIndex={0}>
        <table>
          <caption className="sr-only">CORE 프로그램 1–22차시 요약</caption>
          <thead><tr>{lessonSummaryHeaders.map(header => <th scope="col" key={header}>{header}</th>)}</tr></thead>
          <tbody>{lessonSummaryRows.map(([sessions, ...cells]) => (
            <tr key={sessions}><th scope="row">{sessions}</th>{cells.map((cell, index) => <td key={index}>{cell}</td>)}</tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}
