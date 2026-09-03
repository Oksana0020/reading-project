export const HOME_PRACTICE_STEP_COUNT = 3;

export function normalisePracticeSteps(steps: boolean[]) {
  return Array.from({ length: HOME_PRACTICE_STEP_COUNT }, (_, index) => Boolean(steps[index]));
}

export function isPracticeChecklistComplete(steps: boolean[]) {
  return normalisePracticeSteps(steps).every(Boolean);
}

export function practiceChecklistDate(now = new Date()) {
  return now.toISOString().slice(0, 10);
}
