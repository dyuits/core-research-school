import type { CoreProgram } from "./corePrograms";
import { isFestivalProgram } from "./festivalPrograms";
import { reportSessions } from "./reportSessions";

export function mediaSessionsFor(program: CoreProgram) {
  if (isFestivalProgram(program))
    return [
      { number: 1, title: program.title, label: `축제 · ${program.title}` },
    ];
  return reportSessions
    .filter(item => item.programId === program.id)
    .map(item => ({
      number: item.number,
      title: item.title,
      label: `${item.number}차시 · ${item.title.replace(/^⦁\s*/, "")}`,
    }));
}
