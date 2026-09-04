export type LiveAssessmentMode = "GUIDED_PRACTICE" | "ASSISTED_PRACTICE" | "MONTHLY_ASSESSMENT";
export type LiveWordState = { id: string; text: string; status: "unread" | "current" | "correct" | "incorrect" | "retried_correct"; attempts: number };
import { matchExpectedReadingWord, type ReadingLanguageSupport } from "./dialectSupport";

const wordPattern = /[a-zA-Z]+(?:'[a-zA-Z]+)?/g;
const normalise = (word: string) => word.toLowerCase().replace(/[^a-z']/g, "");
const tokenize = (text: string) => (text.match(wordPattern) ?? []).map(normalise);

export function initialLiveWordStates(text: string): LiveWordState[] {
  return tokenize(text).map((word, index) => ({ id: `word-${index}`, text: word, status: index === 0 ? "current" : "unread", attempts: 0 }));
}

/** Applies the current full live-transcript result against the expected passage. */
export function deriveLiveWordStates(expectedText: string, transcript: string, mode: LiveAssessmentMode, languageSupport: ReadingLanguageSupport = "STANDARD_ENGLISH"): LiveWordState[] {
  const states = initialLiveWordStates(expectedText);
  let expectedIndex = 0;
  for (const heardWord of tokenize(transcript)) {
    const state = states[expectedIndex];
    if (!state) break;
    const matches = matchExpectedReadingWord(state.text, heardWord, languageSupport).matches;
    state.attempts += 1;
    if (mode === "MONTHLY_ASSESSMENT") {
      state.status = matches ? "correct" : "incorrect";
      expectedIndex += 1;
    } else if (matches) {
      state.status = state.attempts > 1 ? "retried_correct" : "correct";
      expectedIndex += 1;
    } else {
      state.status = "incorrect";
    }
  }
  if (expectedIndex < states.length && states[expectedIndex].status === "unread") states[expectedIndex].status = "current";
  return states;
}

export function firstGuidedModelWord(states: LiveWordState[], modelledWordIds: ReadonlySet<string>) {
  return states.find(state => state.status === "incorrect" && state.attempts >= 2 && !modelledWordIds.has(state.id));
}
