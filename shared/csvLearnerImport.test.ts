import { describe, expect, it } from "vitest";
import { parseLearnerImportCsv } from "./csvLearnerImport";

describe("learner CSV import parsing", () => {
  it("accepts a name column, optional book band, and quoted commas", () => {
    const parsed = parseLearnerImportCsv('display_name,book_band\n"Avery, Jr.",Level 4 · Gold\nMorgan Lee,\n');
    expect(parsed).toEqual({ rows: [{ row: 2, displayName: "Avery, Jr.", bookBand: "Level 4 · Gold" }, { row: 3, displayName: "Morgan Lee", bookBand: undefined }], issues: [] });
  });

  it("reports a helpful issue when the display name header is absent", () => {
    expect(parseLearnerImportCsv("book_band\nLevel 3 · Sky Blue\n")).toEqual({ rows: [], issues: [{ row: 1, message: "Add a display_name column to the CSV header." }] });
  });
});
