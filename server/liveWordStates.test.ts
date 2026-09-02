import { describe, expect, it } from "vitest";
import { deriveLiveWordStates, firstGuidedModelWord } from "../shared/liveWordStates";

describe("live transcript word tracking", () => {
  it("keeps an assisted mismatch on the active word until the child self-corrects it", () => {
    const states = deriveLiveWordStates("Amina carried", "Emina Amina carried", "ASSISTED_PRACTICE");
    expect(states[0]).toMatchObject({ text: "amina", status: "retried_correct", attempts: 2 });
    expect(states[1]).toMatchObject({ text: "carried", status: "correct", attempts: 1 });
  });

  it("logs a monthly mismatch without a retry progression", () => {
    const states = deriveLiveWordStates("Amina carried", "Emina carried", "MONTHLY_ASSESSMENT");
    expect(states[0]).toMatchObject({ status: "incorrect", attempts: 1 });
    expect(states[1]).toMatchObject({ status: "correct", attempts: 1 });
  });

  it("finds the first word that requires a guided model after two live mismatches", () => {
    const states = deriveLiveWordStates("Amina carried", "Emina Emina", "GUIDED_PRACTICE");
    expect(firstGuidedModelWord(states, new Set())).toMatchObject({ text: "amina", attempts: 2, status: "incorrect" });
    expect(firstGuidedModelWord(states, new Set(["word-0"]))).toBeUndefined();
  });
});
