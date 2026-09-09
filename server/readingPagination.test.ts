import { describe, expect, it } from "vitest";
import { createReadingPages, isReadingPageComplete } from "../shared/readingPagination";
import type { LiveWordState } from "../shared/liveWordStates";

const states = (count: number): LiveWordState[] => Array.from({ length: count }, (_, index) => ({
  id: `word-${index}`,
  text: `word${index}`,
  status: index === count - 1 ? "current" : "correct",
  attempts: 1,
}));

describe("reading pagination", () => {
  it("keeps a sentence boundary when creating child-readable pages", () => {
    const pages = createReadingPages("One two three four five. Six seven eight nine ten. Eleven twelve thirteen fourteen fifteen.", 12);
    expect(pages).toHaveLength(2);
    expect(pages[0]).toMatchObject({ startWordIndex: 0, endWordIndex: 9 });
    expect(pages[0].tokens.join(" ")).toContain("ten.");
  });

  it("advances only after the final page word is settled", () => {
    const page = { startWordIndex: 0, endWordIndex: 2, tokens: ["one ", "two ", "three."] };
    expect(isReadingPageComplete(page, states(3), "ASSISTED_PRACTICE")).toBe(false);
    const completed = states(3);
    completed[2] = { ...completed[2], status: "correct" };
    expect(isReadingPageComplete(page, completed, "ASSISTED_PRACTICE")).toBe(true);
  });

  it("accepts a three-try moved-on word for practice-page progression but not a first miss", () => {
    const page = { startWordIndex: 0, endWordIndex: 0, tokens: ["tricky"] };
    const firstMiss: LiveWordState[] = [{ id: "word-0", text: "tricky", status: "incorrect", attempts: 1 }];
    const movedOn: LiveWordState[] = [{ id: "word-0", text: "tricky", status: "incorrect", attempts: 3 }];
    expect(isReadingPageComplete(page, firstMiss, "GUIDED_PRACTICE")).toBe(false);
    expect(isReadingPageComplete(page, movedOn, "GUIDED_PRACTICE")).toBe(true);
  });
});
