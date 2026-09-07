import { describe, expect, it } from "vitest";
import { createIrishVariantCsv, irishVariantFilename } from "./irishVariantExport";

describe("Irish variation CSV export", () => {
  it("formats class-approved variations with a stable header and escaped cells", () => {
    const csv = createIrishVariantCsv("Ms, Kelly's Class", [{ expectedWord: "three", recognisedVariant: "tree", updatedAt: new Date("2026-09-07T12:00:00.000Z") }]);
    expect(csv).toBe("Class,Expected Word,Recognised Form,Reviewed Updated (UTC)\n\"Ms, Kelly's Class\",three,tree,2026-09-07T12:00:00.000Z");
  });

  it("uses a readable class-scoped CSV filename", () => {
    expect(irishVariantFilename("Ms Kelly's Reading Class")).toBe("ms-kelly-s-reading-class-approved-irish-english-variations.csv");
  });
});
