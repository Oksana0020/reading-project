import { describe, expect, it } from "vitest";
import { isPracticeChecklistComplete, normalisePracticeSteps, practiceChecklistDate } from "./homePractice";

describe("home practice checklist helpers", () => {
  it("normalises a partial checklist to the three supported steps", () => {
    expect(normalisePracticeSteps([true])).toEqual([true, false, false]);
    expect(normalisePracticeSteps([true, false, true, true])).toEqual([true, false, true]);
  });

  it("only considers all three expected steps complete", () => {
    expect(isPracticeChecklistComplete([true, true, false])).toBe(false);
    expect(isPracticeChecklistComplete([true, true, true])).toBe(true);
  });

  it("stores the daily checklist key in UTC", () => {
    expect(practiceChecklistDate(new Date("2026-09-03T23:59:00.000Z"))).toBe("2026-09-03");
  });
});
