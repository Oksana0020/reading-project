import { describe, expect, it } from "vitest";
import { createMonthlyTrendCsv, monthlyTrendFilename } from "./trendExport";

describe("monthly trend CSV export", () => {
  it("exports the exact chart metrics with safe CSV quoting", () => {
    const csv = createMonthlyTrendCsv("Ms Kelly's Reading Class", [{ month: "2026-06", label: "Jun 2026", storyMatch: 82, wcpm: 88, sessions: 1 }]);
    expect(csv).toBe('"Class","Month","Story Match %","WCPM","Assessment Sessions"\r\n"Ms Kelly\'s Reading Class","Jun 2026","82","88","1"\r\n');
  });

  it("makes a portable, readable report filename", () => {
    expect(monthlyTrendFilename("Ms Kelly's Reading Class")).toBe("ms-kelly-s-reading-class-monthly-assessment-trends.csv");
  });

  it("adds a selected term range to the export filename", () => {
    expect(monthlyTrendFilename("Ms Kelly's Reading Class", { startDate: "2026-09-01", endDate: "2026-12-18" })).toBe("ms-kelly-s-reading-class-monthly-assessment-trends-2026-09-01-to-2026-12-18.csv");
  });
});
