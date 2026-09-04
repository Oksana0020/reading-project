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

export type TrendDateRange = { startDate?: string; endDate?: string };

const monthLabel = (month: string) => new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00.000Z`));

function asUtcStart(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

export function isValidTrendDateRange(range?: TrendDateRange) {
  if (!range?.startDate && !range?.endDate) return true;
  if (range?.startDate && !/^\d{4}-\d{2}-\d{2}$/.test(range.startDate)) return false;
  if (range?.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(range.endDate)) return false;
  return !range?.startDate || !range?.endDate || asUtcStart(range.startDate).getTime() <= asUtcStart(range.endDate).getTime();
}

export function buildMonthlyAssessmentTrend(sessions: AssessmentMetric[], range?: TrendDateRange): MonthlyTrendPoint[] {
  if (!isValidTrendDateRange(range)) throw new Error("Choose an end date that is on or after the start date.");
  const start = range?.startDate ? asUtcStart(range.startDate) : undefined;
  const endExclusive = range?.endDate ? new Date(asUtcStart(range.endDate).getTime() + 24 * 60 * 60 * 1000) : undefined;
  const grouped = new Map<string, AssessmentMetric[]>();
  for (const session of sessions) {
    if (session.assessmentMode !== "MONTHLY_ASSESSMENT") continue;
    if (start && session.createdAt < start) continue;
    if (endExclusive && session.createdAt >= endExclusive) continue;
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
