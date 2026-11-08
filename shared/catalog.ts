export const definitions = {
  programs: {
    label: "교수·학습 프로그램",
    fields: {
      title: "프로그램명",
      researchTask: "연구 과제·보고서 쪽수",
      subject: "관련 교과",
      grade: "대상 학년 및 학급",
      totalSessions: "총 차시",
      description: "프로그램 소개",
      goals: "수업 목표",
      tools: "AI·디지털 도구",
      activities: "주요 활동",
      competencies: "연계 역량",
      assessment: "평가 방법",
      source: "근거 자료·출처",
    },
  },
  sessions: {
    label: "차시별 활동",
    fields: {
      title: "차시명",
      goals: "학습 목표",
      standards: "성취기준",
      content: "주요 학습 내용",
      tools: "활용 도구",
      opening: "도입",
      development: "전개",
      closing: "정리",
      teacherFeedback: "교사 지도 및 피드백",
      studentActivities: "학생 활동",
      assessment: "평가 방법 및 기준",
      competencies: "기대 학생 역량",
    },
  },
  assessments: {
    label: "평가 및 학생 성장",
    fields: {
      title: "자료명",
      category: "분류 (수행평가·루브릭·성장 사례 등)",
      description: "활동 과정·평가·피드백·성장 근거",
    },
  },
  records: {
    label: "생활기록부 기재 예시",
    fields: {
      title: "예시 제목",
      category: "기록 영역",
      description: "실제 수업의 탐구·문제 해결·협업 과정과 관찰 근거",
      example: "기재 예시",
    },
  },
  resources: {
    label: "연구자료실",
    fields: {
      title: "자료명",
      category: "자료 분류",
      description: "자료 설명·연구보고서 연계",
    },
  },
  introduction: {
    label: "연구학교 소개",
    fields: {
      title: "제목",
      topic: "운영 주제",
      purpose: "필요성 및 목적",
      tasks: "연구 과제",
      organization: "운영 체계",
      program: "프로그램 소개",
      schedule: "추진 일정",
      results: "운영 결과",
      source: "근거 자료·출처",
    },
  },
} as const;
export type Kind = keyof typeof definitions;
export type Entry = {
  id: string;
  kind: Kind;
  title: string;
  status: "draft" | "private" | "published";
  programId: string | null;
  sessionId: string | null;
  position: number;
  anonymized: boolean;
  data: Record<string, string>;
  updatedAt: string;
};
export type Attachment = {
  id: string;
  entryId: string;
  name: string;
  category: string;
  format: string;
  size: number;
  uploadedAt: string;
  sha256: string;
};
export const recordCategories = [
  "교과 세부능력 및 특기사항",
  "창의적 체험활동 특기사항",
  "행동특성 및 종합의견",
];
export const resourceCategories = [
  "연구계획서",
  "연구보고서",
  "교수·학습 자료집",
  "공개수업 자료",
  "연구 결과 발표 자료",
  "기타 연구학교 운영 자료",
];
export const attachmentCategories = [
  "교수·학습 지도안",
  "학생용 학습지",
  "수업 활동 자료",
  "수업 발표 자료",
  "평가 자료",
  "활동 결과물 예시",
  "기타 참고자료",
];
