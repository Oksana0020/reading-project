import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

const MAX_EXTRACTED_CHARACTERS = 8_000;

export type ExtractedDocument = {
  text: string;
  sourceType: "pdf" | "docx" | "text";
  truncated: boolean;
};

function cleanExtractedText(value: string) {
  return value.replace(/\u0000/g, "").replace(/\r/g, "").replace(/[\t ]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

export async function extractReadingMaterial(buffer: Buffer, mimeType: string, filename: string): Promise<ExtractedDocument> {
  const extension = filename.toLowerCase().split(".").pop();
  let extracted = "";
  let sourceType: ExtractedDocument["sourceType"];

  if (mimeType === "application/pdf" || extension === "pdf") {
    sourceType = "pdf";
    const parser = new PDFParse({ data: buffer });
    try {
      extracted = (await parser.getText()).text;
    } finally {
      await parser.destroy();
    }
  } else if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || extension === "docx") {
    sourceType = "docx";
    extracted = (await mammoth.extractRawText({ buffer })).value;
  } else if (mimeType.startsWith("text/") || extension === "txt") {
    sourceType = "text";
    extracted = buffer.toString("utf8");
  } else {
    throw new Error("Use a PDF, DOCX, or plain-text reading passage.");
  }

  const text = cleanExtractedText(extracted);
  if (text.length < 80) throw new Error("We could not find enough selectable reading text in that file. Try a text-based PDF, DOCX, or pasted passage.");
  return { text: text.slice(0, MAX_EXTRACTED_CHARACTERS), sourceType, truncated: text.length > MAX_EXTRACTED_CHARACTERS };
}
