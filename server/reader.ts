export type ReadingEventKind = "correct" | "substitution" | "omission" | "insertion" | "repetition";

export type ReadingEvent = {
  expectedWord: string;
  recognisedWord: string | null;
  eventType: ReadingEventKind;
  action: "celebrate" | "stay_silent" | "practise_gently" | "teacher_review";
};

export type ReadingAnalysis = {
  transcript: string;
  accuracy: number;
  pace: number;
  correctWords: number;
  totalWords: number;
  durationSeconds: number;
  practiceWords: string[];
  events: ReadingEvent[];
  childMessage: string;
  nextStep: string;
};

const wordPattern = /[a-zA-Z]+(?:'[a-zA-Z]+)?/g;

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(wordPattern) ?? []).map(word => word.replace(/[^a-z']/g, ""));
}

function displayWord(word: string): string {
  return word.length > 0 ? word[0].toUpperCase() + word.slice(1) : "that word";
}

/**
 * A transparent prototype comparison. It does not diagnose reading ability or
 * treat every transcription difference as a child error; low-certainty words
 * are routed to gentle practice or teacher review rather than correction.
 */
export function analyseReadingText(expectedText: string, transcript: string, durationSeconds: number): ReadingAnalysis {
  const expected = tokenize(expectedText);
  const observed = tokenize(transcript);
  const events: ReadingEvent[] = [];
  let expectedIndex = 0;
  let observedIndex = 0;
  let correctWords = 0;

  while (expectedIndex < expected.length && observedIndex < observed.length) {
    const target = expected[expectedIndex];
    const heard = observed[observedIndex];

    if (target === heard) {
      correctWords += 1;
      events.push({ expectedWord: target, recognisedWord: heard, eventType: "correct", action: "celebrate" });
      expectedIndex += 1;
      observedIndex += 1;
      continue;
    }

    if (observedIndex + 1 < observed.length && target === observed[observedIndex + 1]) {
      events.push({ expectedWord: target, recognisedWord: null, eventType: "insertion", action: "stay_silent" });
      observedIndex += 1;
      continue;
    }

    if (expectedIndex + 1 < expected.length && expected[expectedIndex + 1] === heard) {
      events.push({ expectedWord: target, recognisedWord: null, eventType: "omission", action: "practise_gently" });
      expectedIndex += 1;
      continue;
    }

    if (observedIndex > 0 && heard === observed[observedIndex - 1]) {
      events.push({ expectedWord: target, recognisedWord: heard, eventType: "repetition", action: "stay_silent" });
      observedIndex += 1;
      continue;
    }

    events.push({ expectedWord: target, recognisedWord: heard, eventType: "substitution", action: "teacher_review" });
    expectedIndex += 1;
    observedIndex += 1;
  }

  while (expectedIndex < expected.length) {
    events.push({ expectedWord: expected[expectedIndex], recognisedWord: null, eventType: "omission", action: "practise_gently" });
    expectedIndex += 1;
  }

  const notableEvents = events.filter(event => event.eventType === "substitution" || event.eventType === "omission");
  const practiceWords = Array.from(new Set(notableEvents.map(event => event.expectedWord).filter(word => word.length > 3))).slice(0, 3);
  const effectiveDuration = Math.max(20, Math.round(durationSeconds || 60));
  const accuracy = expected.length > 0 ? Math.round((correctWords / expected.length) * 100) : 0;
  const pace = Math.max(0, Math.round((correctWords / effectiveDuration) * 60));

  const childMessage = accuracy >= 92
    ? "Wonderful focus. You kept the story moving and made your voice clear."
    : accuracy >= 76
      ? "You stayed with a tricky text, and that is how strong readers grow."
      : "Thank you for giving this story a brave try. Every read helps your brain learn the path."

  const practiceHint = practiceWords[0]
    ? `Try “${displayWord(practiceWords[0])}” slowly once, then pop it back into the sentence.`
    : "Choose one sentence you enjoyed and read it again with a smooth, steady voice.";

  return {
    transcript: transcript.trim(),
    accuracy,
    pace,
    correctWords,
    totalWords: expected.length,
    durationSeconds: effectiveDuration,
    practiceWords,
    events,
    childMessage,
    nextStep: practiceHint,
  };
}

export type ReaderRole = "child" | "teacher" | "parent";

/** Role rules ready for account-based class/family relationships. */
export function mayViewChildProgress(viewer: ReaderRole, profileId: string, linkedProfileIds: string[]): boolean {
  if (viewer === "teacher") return true;
  return linkedProfileIds.includes(profileId);
}
