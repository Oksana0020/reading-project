export type AssessmentMetric = {
  assessmentMode: "GUIDED_PRACTICE" | "ASSISTED_PRACTICE" | "MONTHLY_ASSESSMENT";
  accuracy: number;
  wordsCorrectPerMinute: number;
  durationSeconds: number;
  createdAt: Date;
};

export type MonthlyTrendPoint = {
  month: string;
  label: string;
  storyMatch: number;
  wcpm: number;
  sessions: number;
};

const monthLabel = (month: string) => new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00.000Z`));

export function buildMonthlyAssessmentTrend(sessions: AssessmentMetric[]): MonthlyTrendPoint[] {
  const grouped = new Map<string, AssessmentMetric[]>();
  for (const session of sessions) {
    if (session.assessmentMode !== "MONTHLY_ASSESSMENT") continue;
    const month = session.createdAt.toISOString().slice(0, 7);
    grouped.set(month, [...(grouped.get(month) ?? []), session]);
  }
  return Array.from(grouped.entries()).sort(([left], [right]) => left.localeCompare(right)).map(([month, entries]) => ({
    month,
    label: monthLabel(month),
    storyMatch: Math.round(entries.reduce((sum: number, item: AssessmentMetric) => sum + item.accuracy, 0) / entries.length),
    wcpm: Math.round(entries.reduce((sum: number, item: AssessmentMetric) => sum + item.wordsCorrectPerMinute, 0) / entries.length),
    sessions: entries.length,
  }));
}

export function minutesReadThisWeek(sessions: Pick<AssessmentMetric, "durationSeconds" | "createdAt">[], now = new Date()) {
  const boundary = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const seconds = sessions.filter(session => session.createdAt >= boundary).reduce((sum, session) => sum + session.durationSeconds, 0);
  return Math.max(0, Math.round(seconds / 60));
}
