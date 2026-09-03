import type { MonthlyTrendPoint } from "./learningAnalytics";

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function createMonthlyTrendCsv(className: string, points: MonthlyTrendPoint[]) {
  const rows: (string | number)[][] = [["Class", "Month", "Story Match %", "WCPM", "Assessment Sessions"]];
  for (const point of points) rows.push([className, point.label, point.storyMatch, point.wcpm, point.sessions]);
  return `${rows.map(row => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

export function monthlyTrendFilename(className: string) {
  const safeName = className.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "class";
  return `${safeName}-monthly-assessment-trends.csv`;
}
