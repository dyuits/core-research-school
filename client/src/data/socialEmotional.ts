/**
 * Design: 큰 글자 카드 안에서도 사회정서 함양을 활동의 관찰 가능한 장면으로 명료하게 보여 주는 CORE 프로그램 데이터.
 */
export const selCompetencies = [
  { key: "01", title: "자기인식", text: "감정·강점·가치를 알아차리고, 나의 질문을 말로 표현한다." },
  { key: "02", title: "자기관리", text: "감정과 생각을 조절하며, 목표를 향해 탐구 과정을 이어 간다." },
  { key: "03", title: "사회적 인식", text: "다른 사람의 관점과 감정을 이해하고 공감의 언어를 사용한다." },
  { key: "04", title: "관계기술", text: "경청·질문·피드백으로 함께 배우고 갈등을 조율한다." },
  { key: "05", title: "책임 있는 의사결정", text: "정보·타인·공동체에 미칠 영향을 고려해 선택한다." },
];

export const lessonSelFocus: Record<string, { competency: string; evidence: string }> = {
  "creative-reading": { competency: "자기인식", evidence: "읽은 문장을 자신의 가치·정체성과 연결해 나만의 질문으로 기록한다." },
  "creative-news": { competency: "책임 있는 의사결정", evidence: "뉴스 데이터의 의미와 한계를 검토하고 근거 있는 해석을 만든다." },
  "creative-music": { competency: "자기관리", evidence: "음악을 통해 감정 변화를 인식하고 표현 의도를 성찰한다." },
  "creative-dbpia": { competency: "자기관리", evidence: "AI 추천을 비판적으로 검토하고 자신의 관심을 반영한 탐구 질문을 정교화한다." },
  "creative-shortform": { competency: "자기인식", evidence: "온라인 속 나와 진짜 나의 감정·관계를 비교하며 진정성 있는 메시지를 기획한다." },
  "art-creativity": { competency: "자기인식", evidence: "AI 결과물과 자신의 표현 의도를 비교하며 창작의 이유를 설명한다." },
  "biology-jeju": { competency: "책임 있는 의사결정", evidence: "환경 문제를 나의 실천 과제와 연결해 해결 방안을 제안한다." },
  "korean-community": { competency: "관계기술", evidence: "문제로 영향을 받는 사람의 관점을 고려해 공동체 호소문을 작성한다." },
  "english-hobby": { competency: "사회적 인식", evidence: "친구의 취미와 감정 이야기를 경청하고 공감의 문장으로 반응한다." },
  "ethics-empathy": { competency: "사회적 인식", evidence: "갈등 당사자의 입장을 공감 지도로 비교하고 해결 방안을 모색한다." },
};
