import { describe, expect, it } from "vitest";
import { hasChildReadingEvidence } from "../shared/readingEvidence";

describe("hasChildReadingEvidence", () => {
  it("blocks an empty unstarted session from producing a report", () => {
    expect(hasChildReadingEvidence("", [{ attempts: 0 }, { attempts: 0 }])).toBe(false);
  });

  it("accepts either recognised words or a recorded child attempt", () => {
    expect(hasChildReadingEvidence("Amina carried", [{ attempts: 0 }])).toBe(true);
    expect(hasChildReadingEvidence("", [{ attempts: 3 }, { attempts: 0 }])).toBe(true);
  });
});
