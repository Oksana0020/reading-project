export type ParsedLearnerImportRow = {
  row: number;
  displayName: string;
  bookBand?: string;
};

export type CsvImportIssue = { row: number; message: string };

export type LearnerImportColumnMapping = {
  displayNameColumn: string;
  bookBandColumn?: string;
};

export type LearnerImportCsvPreview = {
  headers: string[];
  suggestedMapping: LearnerImportColumnMapping;
  issues: CsvImportIssue[];
};

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

function detectHeader(headers: string[], accepted: string[]) {
  return headers.find(header => accepted.includes(normaliseHeader(header)));
}

function readRecords(text: string): { records: string[][]; issues: CsvImportIssue[] } {
  if (text.length > 200_000) return { records: [], issues: [{ row: 0, message: "Use a CSV file smaller than 200 KB." }] };
  try {
    const records = parseCsvRecords(text.replace(/^\uFEFF/, ""));
    if (!records.length) return { records: [], issues: [{ row: 0, message: "The CSV does not contain any rows." }] };
    return { records, issues: [] };
  } catch (error) {
    return { records: [], issues: [{ row: 0, message: error instanceof Error ? error.message : "The CSV could not be read." }] };
  }
}

export function inspectLearnerImportCsv(text: string): LearnerImportCsvPreview {
  const { records, issues } = readRecords(text);
  if (!records.length) return { headers: [], suggestedMapping: { displayNameColumn: "" }, issues };
  const headers = records[0].map(header => header.trim()).filter(Boolean);
  const displayNameColumn = detectHeader(headers, ["display name", "student name", "learner name", "name", "pupil name", "full name"])
    ?? headers[0]
    ?? "";
  const bookBandColumn = detectHeader(headers, ["book band", "reading level", "level", "reading stage", "year group"]);
  return { headers, suggestedMapping: { displayNameColumn, ...(bookBandColumn ? { bookBandColumn } : {}) }, issues };
}

export function parseLearnerImportCsv(text: string, mapping?: LearnerImportColumnMapping): { rows: ParsedLearnerImportRow[]; issues: CsvImportIssue[] } {
  const { records, issues: readIssues } = readRecords(text);
  if (!records.length) return { rows: [], issues: readIssues };
  const rawHeaders = records[0].map(header => header.trim());
  const headers = rawHeaders.map(normaliseHeader);
  const selectedNameHeader = mapping?.displayNameColumn ? normaliseHeader(mapping.displayNameColumn) : undefined;
  const selectedBookBandHeader = mapping?.bookBandColumn ? normaliseHeader(mapping.bookBandColumn) : undefined;
  const nameIndex = selectedNameHeader ? headers.findIndex(header => header === selectedNameHeader) : headers.findIndex(header => ["display name", "student name", "learner name", "name", "pupil name", "full name"].includes(header));
  const bookBandIndex = selectedBookBandHeader ? headers.findIndex(header => header === selectedBookBandHeader) : headers.findIndex(header => ["book band", "reading level", "level", "reading stage", "year group"].includes(header));
  if (nameIndex < 0) return { rows: [], issues: [{ row: 1, message: mapping?.displayNameColumn ? `The mapped learner-name column “${mapping.displayNameColumn}” was not found.` : "Map a learner-name column before importing." }] };
  const rows: ParsedLearnerImportRow[] = [];
  const issues: CsvImportIssue[] = [...readIssues];
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
