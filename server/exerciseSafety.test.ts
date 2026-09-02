import { describe, expect, it } from "vitest";
import { assertSafeExerciseSet } from "./exerciseSafety";

const safeExercise = {
  vocabulary: [
    { word: "glimmered", childFriendlyMeaning: "shone with a soft, tiny light" },
    { word: "gentle", childFriendlyMeaning: "soft and careful" },
    { word: "quiet", childFriendlyMeaning: "making little or no noise" },
  ],
  questions: [
    { prompt: "Where did Mina find the kite?", options: ["In the grass", "On a bus", "At the shop"], answer: "In the grass", explanation: "The story says it was caught in tall grass." },
    { prompt: "What helped the kite rise?", options: ["A gentle wind", "A loud bell", "A train"], answer: "A gentle wind", explanation: "The wind carried the kite higher." },
    { prompt: "How did Mina feel?", options: ["Happy", "Sleepy", "Cross"], answer: "Happy", explanation: "Mina laughed as the kite danced." },
  ],
  activity: "Draw the kite and tell a partner one detail you remember.",
};

describe("generated exercise safeguards", () => {
  it("accepts a child-appropriate exercise with answer choices", () => {
    expect(assertSafeExerciseSet(safeExercise)).toEqual(safeExercise);
  });

  it("rejects a draft with unsuitable content", () => {
    expect(() => assertSafeExerciseSet({ ...safeExercise, activity: "Describe a weapon from the story." })).toThrow("needs teacher revision");
  });

  it("rejects a question whose answer is not one of its options", () => {
    const questions = safeExercise.questions.map(question => ({ ...question }));
    questions[0].answer = "At the beach";
    expect(() => assertSafeExerciseSet({ ...safeExercise, questions })).toThrow("matching answer choice");
  });
});
