export type IrishVariantExportRow = {
  expectedWord: string;
  recognisedVariant: string;
  updatedAt: Date;
};

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function createIrishVariantCsv(className: string, variants: IrishVariantExportRow[]) {
  const header = ["Class", "Expected Word", "Recognised Form", "Reviewed Updated (UTC)"];
  const rows = variants.map(variant => [className, variant.expectedWord, variant.recognisedVariant, variant.updatedAt.toISOString()]);
  return [header, ...rows].map(row => row.map(csvCell).join(",")).join("\n");
}

export function irishVariantFilename(className: string) {
  const slug = className.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "class";
  return `${slug}-approved-irish-english-variations.csv`;
}
