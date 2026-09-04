export type ParsedLearnerImportRow = {
  row: number;
  displayName: string;
  bookBand?: string;
};

export type CsvImportIssue = { row: number; message: string };

function normaliseHeader(value: string) {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, " ");
}

function parseCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let value = "";
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '"' && inQuotes && next === '"') { value += '"'; index += 1; continue; }
    if (character === '"') { inQuotes = !inQuotes; continue; }
    if (character === "," && !inQuotes) { record.push(value); value = ""; continue; }
    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && next === "\n") index += 1;
      record.push(value);
      if (record.some(cell => cell.trim())) records.push(record);
      record = [];
      value = "";
      continue;
    }
    value += character;
  }
  if (inQuotes) throw new Error("The CSV has an unclosed quoted value.");
  record.push(value);
  if (record.some(cell => cell.trim())) records.push(record);
  return records;
}

export function parseLearnerImportCsv(text: string): { rows: ParsedLearnerImportRow[]; issues: CsvImportIssue[] } {
  if (text.length > 200_000) return { rows: [], issues: [{ row: 0, message: "Use a CSV file smaller than 200 KB." }] };
  let records: string[][];
  try { records = parseCsvRecords(text.replace(/^\uFEFF/, "")); } catch (error) { return { rows: [], issues: [{ row: 0, message: error instanceof Error ? error.message : "The CSV could not be read." }] }; }
  if (!records.length) return { rows: [], issues: [{ row: 0, message: "The CSV does not contain any rows." }] };
  const headers = records[0].map(normaliseHeader);
  const nameIndex = headers.findIndex(header => ["display name", "student name", "learner name", "name"].includes(header));
  const bookBandIndex = headers.findIndex(header => ["book band", "reading level", "level"].includes(header));
  if (nameIndex < 0) return { rows: [], issues: [{ row: 1, message: "Add a display_name column to the CSV header." }] };
  const rows: ParsedLearnerImportRow[] = [];
  const issues: CsvImportIssue[] = [];
  records.slice(1, 101).forEach((record, index) => {
    const row = index + 2;
    const displayName = (record[nameIndex] ?? "").trim().replace(/\s+/g, " ");
    const bookBand = bookBandIndex >= 0 ? (record[bookBandIndex] ?? "").trim().replace(/\s+/g, " ") : undefined;
    if (!displayName && !bookBand) return;
    if (!displayName) { issues.push({ row, message: "A learner name is required." }); return; }
    rows.push({ row, displayName, bookBand: bookBand || undefined });
  });
  if (records.length > 101) issues.push({ row: 102, message: "Only the first 100 learner rows can be imported at once." });
  return { rows, issues };
}

export const learnerImportTemplate = "display_name,book_band\nAvery Jones,Level 3 · Sky Blue\nMorgan Lee,Level 4 · Gold\n";
