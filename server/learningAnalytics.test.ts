import { describe, expect, it } from "vitest";
import { buildMonthlyAssessmentTrend, minutesReadThisWeek } from "./learningAnalytics";

describe("assessment analytics", () => {
  const monthly = (date: string, accuracy: number, wcpm: number, durationSeconds = 120) => ({ assessmentMode: "MONTHLY_ASSESSMENT" as const, accuracy, wordsCorrectPerMinute: wcpm, durationSeconds, createdAt: new Date(date) });

  it("groups monthly assessment story match and WCPM into chronological trend points", () => {
    const trend = buildMonthlyAssessmentTrend([monthly("2026-09-04", 92, 102), monthly("2026-08-03", 84, 88), monthly("2026-09-20", 96, 110), { ...monthly("2026-09-29", 100, 120), assessmentMode: "ASSISTED_PRACTICE" as const }]);
    expect(trend).toEqual([{ month: "2026-08", label: "Aug 2026", storyMatch: 84, wcpm: 88, sessions: 1 }, { month: "2026-09", label: "Sep 2026", storyMatch: 94, wcpm: 106, sessions: 2 }]);
  });

  it("limits term trends to an inclusive UTC date range", () => {
    const trend = buildMonthlyAssessmentTrend([monthly("2026-06-03", 82, 88), monthly("2026-07-03", 87, 96), monthly("2026-08-03", 92, 104)], { startDate: "2026-07-01", endDate: "2026-08-03" });
    expect(trend).toEqual([{ month: "2026-07", label: "Jul 2026", storyMatch: 87, wcpm: 96, sessions: 1 }, { month: "2026-08", label: "Aug 2026", storyMatch: 92, wcpm: 104, sessions: 1 }]);
  });

  it("counts only completed-session minutes from the current week", () => {
    const minutes = minutesReadThisWeek([{ durationSeconds: 110, createdAt: new Date("2026-09-01T12:00:00Z") }, { durationSeconds: 230, createdAt: new Date("2026-08-18T12:00:00Z") }], new Date("2026-09-02T12:00:00Z"));
    expect(minutes).toBe(2);
  });
});
