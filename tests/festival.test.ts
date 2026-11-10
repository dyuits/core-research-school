import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { festivalPrograms } from "../client/src/data/festivalPrograms";
import { mediaSessionsFor } from "../client/src/data/mediaSessions";
import { corePrograms } from "../client/src/data/corePrograms";
import { reportSessions } from "../client/src/data/reportSessions";

test("축제 4개 활동은 정규 22차시와 분리하고 사진·PPT 서버의 허용 목록에 연결한다", () => {
  const map = JSON.parse(
    readFileSync(
      new URL("../photo-service/lesson-map.json", import.meta.url),
      "utf8"
    )
  );
  assert.equal(festivalPrograms.length, 4);
  assert.equal(new Set(festivalPrograms.map(program => program.id)).size, 4);
  assert.equal(corePrograms.length, 10);
  assert.equal(reportSessions.length, 22);
  for (const program of festivalPrograms) {
    assert.ok(!corePrograms.some(lesson => lesson.id === program.id));
    assert.ok(!reportSessions.some(lesson => lesson.programId === program.id));
    const [activity] = mediaSessionsFor(program);
    assert.ok(activity.label.startsWith("축제 · "));
    assert.ok(
      map.some(
        (item: { programId: string; number: number }) =>
          item.programId === program.id && item.number === activity.number
      )
    );
  }
  for (const program of corePrograms) {
    assert.deepEqual(
      mediaSessionsFor(program).map(item => item.number),
      reportSessions
        .filter(item => item.programId === program.id)
        .map(item => item.number)
    );
  }
});
