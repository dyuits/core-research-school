import type { CoreProgram } from "./corePrograms";

/** 정규 1–22차시와 별도로 운영한 축제 활동. 차시 번호를 추가하지 않는다. */
export const festivalPrograms: CoreProgram[] = [
  {
    id: "festival-drone",
    track: "확장",
    sequence: 1,
    sessions: "축제 별도 활동",
    subject: "기술 · 협업 · 문제해결",
    title: "드론 경주 반 토너먼트",
    subtitle: "조종의 정교함과 팀의 전략이 만나는 레이스",
    goal: "반별 드론 경주를 통해 디지털 기기의 작동과 조종을 경험하고, 팀원과 전략을 조율하며 문제를 해결하는 활동이다.",
    steps: [
      {
        key: "C",
        label: "Connect",
        text: "드론 조종 경험과 경주에서 해결해야 할 과제를 연결한다.",
      },
      {
        key: "O",
        label: "Observe",
        text: "경주 경로와 드론의 움직임, 팀의 조종 전략을 관찰한다.",
      },
      {
        key: "R",
        label: "Reflect",
        text: "경주 과정에서 생긴 문제를 돌아보고 다음 시도의 전략을 조정한다.",
      },
      {
        key: "E",
        label: "Express",
        text: "팀의 전략과 경험을 공유하고 서로의 도전을 응원한다.",
      },
    ],
    tools: ["드론"],
    output: "경주 활동 사진 · 팀 전략과 협업 과정 기록",
  },
  {
    id: "festival-goldenbell",
    track: "확장",
    sequence: 2,
    sessions: "축제 별도 활동",
    subject: "AI 이해 · 판단 · 도전",
    title: "AI 골든벨",
    subtitle: "함께 풀고, 다시 생각하는 AI 지식 챌린지",
    goal: "AI 골든벨에 참여하며 인공지능과 디지털 활용에 대한 이해를 점검하고, 질문의 근거를 살피며 자신의 판단을 설명하는 활동이다.",
    steps: [
      {
        key: "C",
        label: "Connect",
        text: "일상에서 만난 AI 경험을 퀴즈의 질문과 연결한다.",
      },
      {
        key: "O",
        label: "Observe",
        text: "문제의 핵심 개념과 선택지의 차이를 살핀다.",
      },
      {
        key: "R",
        label: "Reflect",
        text: "답을 고른 근거를 돌아보며 오개념을 점검한다.",
      },
      {
        key: "E",
        label: "Express",
        text: "자신의 판단을 표현하고 새롭게 알게 된 내용을 공유한다.",
      },
    ],
    tools: ["AI·디지털 퀴즈 자료"],
    output: "골든벨 참여 사진 · 문제와 응답 과정 기록",
  },
  {
    id: "festival-shortform",
    track: "확장",
    sequence: 3,
    sessions: "축제 별도 활동",
    subject: "미디어 · 창작 · 소통",
    title: "숏폼 대회",
    subtitle: "짧은 장면에 담아낸 우리만의 시선과 이야기",
    goal: "숏폼 영상으로 자신의 생각과 메시지를 표현하고, 다른 사람의 작품을 감상하며 디지털 미디어를 통한 소통을 경험하는 활동이다.",
    steps: [
      {
        key: "C",
        label: "Connect",
        text: "표현하고 싶은 경험과 메시지를 영상의 주제로 연결한다.",
      },
      {
        key: "O",
        label: "Observe",
        text: "짧은 영상이 메시지를 전달하는 장면과 표현 방식을 살핀다.",
      },
      {
        key: "R",
        label: "Reflect",
        text: "전달 의도와 실제 표현을 비교하고 저작권·초상권을 점검한다.",
      },
      {
        key: "E",
        label: "Express",
        text: "완성한 숏폼을 공유하고 서로의 시선에 피드백을 나눈다.",
      },
    ],
    tools: ["영상 촬영·편집 도구"],
    output: "숏폼 작품 · 제작 과정 사진 · 동료 피드백",
  },
  {
    id: "festival-music",
    track: "확장",
    sequence: 4,
    sessions: "축제 별도 활동",
    subject: "음악 · AI 창작 · 공연",
    title: "AI로 만든 음악 연주",
    subtitle: "기술로 시작해 우리의 감성으로 완성한 무대",
    goal: "AI로 만든 음악을 연주하며 생성 결과와 사람의 해석이 만나는 창작 과정을 경험하고, 음악으로 생각과 감정을 나누는 활동이다.",
    steps: [
      {
        key: "C",
        label: "Connect",
        text: "음악으로 전하고 싶은 감정과 창작 의도를 연결한다.",
      },
      {
        key: "O",
        label: "Observe",
        text: "AI로 만든 음악의 분위기와 구성, 연주할 부분을 살핀다.",
      },
      {
        key: "R",
        label: "Reflect",
        text: "생성된 음악과 표현 의도를 비교하며 연주 방식을 조정한다.",
      },
      {
        key: "E",
        label: "Express",
        text: "연주를 통해 음악을 공유하고 창작·감상의 경험을 나눈다.",
      },
    ],
    tools: ["AI 음악 창작 도구", "연주 도구"],
    output: "음악·연주 결과물 · 준비와 공연 사진",
  },
];

export const isFestivalProgram = (program: CoreProgram) =>
  festivalPrograms.some(item => item.id === program.id);
