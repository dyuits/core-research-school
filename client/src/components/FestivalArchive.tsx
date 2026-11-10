import {
  ArrowUpRight,
  Clapperboard,
  Music2,
  Sparkles,
  Trophy,
} from "lucide-react";
import type { SVGProps } from "react";
import type { CoreProgram } from "@/data/corePrograms";
import { festivalPrograms } from "@/data/festivalPrograms";

function Drone({
  size = 32,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="7" cy="7" r="5" />
      <circle cx="25" cy="7" r="5" />
      <circle cx="7" cy="25" r="5" />
      <circle cx="25" cy="25" r="5" />
      <path d="m7 7 7 7m11-7-7 7M7 25l7-7m11 7-7-7" />
      <rect x="12" y="12" width="8" height="8" rx="2" />
    </svg>
  );
}

const icons = [Drone, Trophy, Clapperboard, Music2];
const labels = [
  "DRONE RACING",
  "AI GOLDEN BELL",
  "SHORT-FORM FILM",
  "AI MUSIC STAGE",
];

export default function FestivalArchive({
  onOpen,
}: {
  onOpen: (program: CoreProgram) => void;
}) {
  return (
    <section className="festival-archive" aria-labelledby="festival-title">
      <div className="festival-hero">
        <div className="festival-hero-copy">
          <span className="festival-eyebrow">
            <Sparkles size={16} aria-hidden="true" /> SPECIAL PROGRAM · 정규
            22차시 외 별도 활동
          </span>
          <h3 id="festival-title">
            AI·디지털
            <br />
            <em>창의융합축제</em>
          </h3>
          <p>
            레이스의 몰입, 질문의 발견,
            <br />
            영상의 시선, 음악의 감성.
            <br />
            교실에서 넓어진 배움이 축제의 무대로 이어집니다.
          </p>
          <a href="#festival-activities">
            네 가지 활동 살펴보기 <ArrowUpRight size={18} aria-hidden="true" />
          </a>
        </div>
        <div className="festival-constellation" aria-hidden="true">
          <div className="festival-orbit" />
          <div className="festival-orbit inner" />
          <div className="festival-orbit-center">
            <Sparkles size={34} />
            <b>
              CREATE.
              <br />
              CONNECT.
              <br />
              CELEBRATE.
            </b>
          </div>
          {icons.map((Icon, index) => (
            <span
              className={`festival-orbit-icon orbit-${index}`}
              key={labels[index]}
            >
              <Icon size={32} />
            </span>
          ))}
          <span className="festival-art-note">
            FOUR EXPERIENCES / ONE FESTIVAL
          </span>
        </div>
      </div>
      <div className="festival-section-heading" id="festival-activities">
        <div>
          <span>FESTIVAL ARCHIVE</span>
          <h4>네 가지 무대, 다채로운 배움</h4>
        </div>
        <p>
          활동을 선택하면 개요·CORE 활동·PPT·현장 사진·기록 작성 메뉴를 볼 수
          있습니다.
        </p>
      </div>
      <div className="festival-activity-grid">
        {festivalPrograms.map((program, index) => {
          const Icon = icons[index];
          return (
            <button
              key={program.id}
              className={`festival-activity festival-activity-${index}`}
              onClick={() => onOpen(program)}
            >
              <div className="festival-card-top">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <Icon size={32} aria-hidden="true" />
              </div>
              <small>{labels[index]}</small>
              <h5>{program.title}</h5>
              <p>{program.subtitle}</p>
              <span className="festival-subject">{program.subject}</span>
              <div className="festival-card-footer">
                <span>활동 아카이브 열기</span>
                <ArrowUpRight size={22} aria-hidden="true" />
              </div>
            </button>
          );
        })}
      </div>
      <p className="festival-teacher-note">
        교사용 활동 안내 · 활동 개요와 CORE 흐름은 축제 내용을 살펴보기 위한
        안내입니다. 실제 운영 장면과 결과물은 각 활동의 사진·PPT 메뉴에서 확인할
        수 있습니다.
      </p>
    </section>
  );
}
