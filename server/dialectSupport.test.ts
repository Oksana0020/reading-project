import { describe, expect, it } from "vitest";
import { matchExpectedReadingWord } from "../shared/dialectSupport";

describe("Irish English variation support", () => {
  it("keeps the reviewed variation list opt-in and bounded", () => {
    expect(matchExpectedReadingWord("caught", "cot", "STANDARD_ENGLISH")).toEqual({ matches: false, provisionalIrishEnglish: false });
    expect(matchExpectedReadingWord("caught", "cot", "IRISH_ENGLISH_SUPPORT")).toEqual({ matches: true, provisionalIrishEnglish: true });
    expect(matchExpectedReadingWord("caught", "cat", "IRISH_ENGLISH_SUPPORT")).toEqual({ matches: false, provisionalIrishEnglish: false });
  });
});
