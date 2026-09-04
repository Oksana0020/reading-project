import { describe, expect, it } from "vitest";
import { analyseReadingText, initialiseWordStates, mayViewChildProgress, tokenize } from "./reader";
import { isTeacher } from "./readerDb";

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

  it("recognises only teacher and administrator roles as teacher privileges", () => {
    expect(isTeacher("teacher")).toBe(true);
    expect(isTeacher("admin")).toBe(true);
    expect(isTeacher("parent")).toBe(false);
    expect(isTeacher("child")).toBe(false);
  });

  it("records an assisted-practice self-correction and retry count", () => {
    const attempts = initialiseWordStates("The glimmered lantern");
    attempts[1] = { ...attempts[1], attempts: 2, status: "retried_correct" };
    const result = analyseReadingText("The glimmered lantern", "The glimmered lantern", 30, "ASSISTED_PRACTICE", attempts);
    expect(result.selfCorrections).toContain("glimmered");
    expect(result.retrySummary).toContainEqual({ word: "glimmered", retries: 1 });
    expect(result.wordStates[1].status).toBe("retried_correct");
  });

  it("keeps monthly assessment feedback silent and scores only the first pass", () => {
    const attempts = initialiseWordStates("The glimmered lantern");
    attempts[1] = { ...attempts[1], attempts: 3, status: "retried_correct" };
    const result = analyseReadingText("The glimmered lantern", "The lantern", 30, "MONTHLY_ASSESSMENT", attempts);
    expect(result.practiceWords).toEqual([]);
    expect(result.retrySummary).toEqual([]);
    expect(result.selfCorrections).toEqual([]);
    expect(result.events.find(event => event.eventType === "omission")?.action).toBe("teacher_review");
    expect(result.nextStep).toContain("No correction prompts");
  });

  it("requests a model word after two guided-practice attempts remain incorrect", () => {
    const attempts = initialiseWordStates("The glimmered lantern");
    attempts[1] = { ...attempts[1], attempts: 2, status: "incorrect" };
    const result = analyseReadingText("The glimmered lantern", "The lantern", 30, "GUIDED_PRACTICE", attempts);
    expect(result.modelWords).toContain("glimmered");
  });

  it("accepts reviewed Irish English transcript variants provisionally and keeps them in teacher review", () => {
    const result = analyseReadingText("The thin path was caught", "The tin pat was cot", 30, "ASSISTED_PRACTICE", undefined, "IRISH_ENGLISH_SUPPORT");
    expect(result.accuracy).toBe(100);
    expect(result.practiceWords).toEqual([]);
    expect(result.events.filter(event => event.eventType === "dialect_variation")).toHaveLength(3);
    expect(result.events.filter(event => event.eventType === "dialect_variation").every(event => event.action === "teacher_review")).toBe(true);
  });

  it("does not accept reviewed Irish English variants when the teacher has not enabled the support profile", () => {
    const result = analyseReadingText("The caught kite", "The cot kite", 30);
    expect(result.accuracy).toBeLessThan(100);
    expect(result.events.some(event => event.eventType === "substitution")).toBe(true);
  });
});
