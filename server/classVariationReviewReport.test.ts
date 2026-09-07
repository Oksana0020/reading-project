import { describe, expect, it } from "vitest";
import { createClassVariationReviewPdf } from "./classVariationReviewReport";

describe("createClassVariationReviewPdf", () => {
  it("creates a branded printable teacher-review PDF with approved and provisional variation context", async () => {
    const pdf = await createClassVariationReviewPdf({
      className: "Otters",
      branding: { schoolName: "Example School", accentColor: "#2563EB", footerLine: "Every reader can grow." },
      variants: [{ expectedWord: "three", recognisedVariant: "tree", updatedAt: new Date("2026-09-07T00:00:00.000Z") }],
      reviews: [{ childName: "Amina", storyTitle: "The Moonlight Kite", expectedWord: "three", recognisedWord: "tree", source: "educator_approved", status: "pending", createdAt: new Date("2026-09-07T00:00:00.000Z"), confirmedAt: null }],
    });

    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.length).toBeGreaterThan(900);
  });
});
