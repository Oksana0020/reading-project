import type { ExerciseSet } from "../drizzle/schema";

const blockedTerms = ["kill", "suicide", "self harm", "weapon", "explicit", "drug", "gambling"];

export function assertSafeExerciseSet(exerciseSet: ExerciseSet): ExerciseSet {
  const fullText = [
    exerciseSet.activity,
    ...exerciseSet.vocabulary.flatMap(item => [item.word, item.childFriendlyMeaning]),
    ...exerciseSet.questions.flatMap(item => [item.prompt, item.answer, item.explanation, ...item.options]),
  ].join(" ").toLowerCase();

  if (blockedTerms.some(term => fullText.includes(term))) {
    throw new Error("The exercise draft needs teacher revision before it can be used.");
  }

  for (const question of exerciseSet.questions) {
    if (!question.options.includes(question.answer)) {
      throw new Error("The exercise draft contained a question without a matching answer choice.");
    }
  }

  return exerciseSet;
}
