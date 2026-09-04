import { describe, expect, it } from "vitest";
import { inspectLearnerImportCsv, parseLearnerImportCsv } from "./csvLearnerImport";

describe("learner CSV import parsing", () => {
  it("accepts a name column, optional book band, and quoted commas", () => {
    const parsed = parseLearnerImportCsv('display_name,book_band\n"Avery, Jr.",Level 4 · Gold\nMorgan Lee,\n');
    expect(parsed).toEqual({ rows: [{ row: 2, displayName: "Avery, Jr.", bookBand: "Level 4 · Gold" }, { row: 3, displayName: "Morgan Lee", bookBand: undefined }], issues: [] });
  });

  it("requires a learner-name mapping when an export has no recognised name heading", () => {
    expect(parseLearnerImportCsv("admission_number,book_band\n1001,Level 3 · Sky Blue\n")).toEqual({ rows: [], issues: [{ row: 1, message: "Map a learner-name column before importing." }] });
  });

  it("inspects common MIS headings and imports the explicitly mapped values", () => {
    const csv = "Pupil Name,Year Group,Admission Number\nAvery Jones,Year 4,1001\nMorgan Lee,Year 5,1002\n";
    const preview = inspectLearnerImportCsv(csv);
    expect(preview.headers).toEqual(["Pupil Name", "Year Group", "Admission Number"]);
    expect(preview.suggestedMapping).toEqual({ displayNameColumn: "Pupil Name", bookBandColumn: "Year Group" });
    expect(parseLearnerImportCsv(csv, preview.suggestedMapping)).toEqual({ rows: [{ row: 2, displayName: "Avery Jones", bookBand: "Year 4" }, { row: 3, displayName: "Morgan Lee", bookBand: "Year 5" }], issues: [] });
  });
});
