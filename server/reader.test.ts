import { describe, expect, it } from "vitest";
import { analyseReadingText, mayViewChildProgress, tokenize } from "./reader";

describe("Reader Leader prototype analysis", () => {
  it("tokenizes child-friendly text without punctuation", () => {
    expect(tokenize("A kite's tail—swirled!")).toEqual(["a", "kite's", "tail", "swirled"]);
  });

  it("reports an exact read with a positive message", () => {
    const result = analyseReadingText("The bright kite rose", "The bright kite rose", 30);
    expect(result.accuracy).toBe(100);
    expect(result.pace).toBe(8);
    expect(result.childMessage).toContain("Wonderful");
  });

  it("selects gentle practice words for an omission", () => {
    const result = analyseReadingText("The glimmered lantern shone", "The lantern shone", 20);
    expect(result.practiceWords).toContain("glimmered");
    expect(result.events.some(event => event.eventType === "omission" && event.action === "practise_gently")).toBe(true);
  });

  it("keeps a child or parent scoped to linked profiles while teachers can view class progress", () => {
    expect(mayViewChildProgress("child", "amina", ["amina"])).toBe(true);
    expect(mayViewChildProgress("parent", "leo", ["amina"])).toBe(false);
    expect(mayViewChildProgress("teacher", "leo", [])).toBe(true);
  });
});
