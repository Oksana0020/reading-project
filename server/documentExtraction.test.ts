import { describe, expect, it } from "vitest";
import { extractReadingMaterial } from "./documentExtraction";

describe("reading material extraction", () => {
  it("extracts and cleans a plain-text teacher passage for review", async () => {
    const result = await extractReadingMaterial(Buffer.from("Mina found a bright kite caught in the tall grass. Its silver tail glimmered in the moonlight. She lifted the string and the kite rose over the quiet field."), "text/plain", "moonlight-kite.txt");
    expect(result.sourceType).toBe("text");
    expect(result.text).toContain("bright kite");
    expect(result.truncated).toBe(false);
  });

  it("rejects unsupported uploaded file formats", async () => {
    await expect(extractReadingMaterial(Buffer.from("A reading passage with enough letters to make it long and complete for a safe classroom preview."), "image/png", "picture.png")).rejects.toThrow("PDF, DOCX, or plain-text");
  });
});
