import { describe, expect, it } from "vitest";
import { matchExpectedReadingWord } from "../shared/dialectSupport";

describe("Irish English variation support", () => {
  it("keeps the reviewed variation list opt-in and bounded", () => {
    expect(matchExpectedReadingWord("caught", "cot", "STANDARD_ENGLISH")).toEqual({ matches: false, provisionalIrishEnglish: false });
    expect(matchExpectedReadingWord("caught", "cot", "IRISH_ENGLISH_SUPPORT")).toEqual({ matches: true, provisionalIrishEnglish: true, source: "built_in" });
    expect(matchExpectedReadingWord("caught", "cat", "IRISH_ENGLISH_SUPPORT")).toEqual({ matches: false, provisionalIrishEnglish: false });
  });

  it("uses a teacher-approved class variant only with Irish English support enabled", () => {
    const approved = [{ expectedWord: "three", recognisedVariant: "tree" }];
    expect(matchExpectedReadingWord("three", "tree", "STANDARD_ENGLISH", approved)).toEqual({ matches: false, provisionalIrishEnglish: false });
    expect(matchExpectedReadingWord("three", "tree", "IRISH_ENGLISH_SUPPORT", approved)).toEqual({ matches: true, provisionalIrishEnglish: true, source: "educator_approved" });
  });
});
