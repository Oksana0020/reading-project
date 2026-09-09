import { describe, expect, it } from "vitest";
import { appendRecognitionTranscript } from "../shared/recognitionTranscript";

describe("appendRecognitionTranscript", () => {
  it("retains recognised words before a browser recognition restart", () => {
    expect(appendRecognitionTranscript("Amina carried", "a little lantern")).toBe("Amina carried a little lantern");
  });

  it("does not introduce empty or repeated whitespace segments", () => {
    expect(appendRecognitionTranscript("", "  garden  ")).toBe("garden");
    expect(appendRecognitionTranscript("garden", "")).toBe("garden");
  });
});
