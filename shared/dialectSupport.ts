export const readingLanguageSupportValues = ["STANDARD_ENGLISH", "IRISH_ENGLISH_SUPPORT"] as const;
export type ReadingLanguageSupport = (typeof readingLanguageSupportValues)[number];

export const readingLanguageSupportLabels: Record<ReadingLanguageSupport, string> = {
  STANDARD_ENGLISH: "Standard English comparison",
  IRISH_ENGLISH_SUPPORT: "Irish English support · teacher review",
};

export const normaliseIrishReadingWord = (word: string) => word.toLocaleLowerCase("en-IE").replace(/[^a-z']/g, "");

/**
 * A deliberately small, review-led Irish English tolerance list.
 *
 * Whisper returns words rather than phonemes, so this does not attempt accent
 * classification. It only recognises selected transcript substitutions that can
 * reflect regional realisations and asks a teacher to confirm them from audio.
 */
const irishEnglishReviewedVariants: Record<string, readonly string[]> = {
  bath: ["bat"],
  path: ["pat"],
  grass: ["gras"],
  class: ["clas"],
  castle: ["cassel"],
  caught: ["cot"],
  court: ["cort"],
  park: ["pork"],
  hard: ["hod"],
  card: ["cod"],
  thin: ["tin"],
  thing: ["ting"],
  three: ["tree"],
  through: ["true"],
  this: ["dis"],
  that: ["dat"],
  them: ["dem"],
  then: ["den"],
  they: ["day"],
  with: ["wit"],
};

export type EducatorApprovedIrishVariant = { expectedWord: string; recognisedVariant: string };
export type DialectMatch = { matches: boolean; provisionalIrishEnglish: boolean; source?: "built_in" | "educator_approved" };

export function matchExpectedReadingWord(expectedWord: string, recognisedWord: string, support: ReadingLanguageSupport = "STANDARD_ENGLISH", educatorApprovedVariants: EducatorApprovedIrishVariant[] = []): DialectMatch {
  const expected = normaliseIrishReadingWord(expectedWord);
  const recognised = normaliseIrishReadingWord(recognisedWord);
  if (expected === recognised) return { matches: true, provisionalIrishEnglish: false };
  if (support !== "IRISH_ENGLISH_SUPPORT" || !expected) return { matches: false, provisionalIrishEnglish: false };
  const educatorApproved = educatorApprovedVariants.some(variant => normaliseIrishReadingWord(variant.expectedWord) === expected && normaliseIrishReadingWord(variant.recognisedVariant) === recognised);
  if (educatorApproved) return { matches: true, provisionalIrishEnglish: true, source: "educator_approved" };
  return irishEnglishReviewedVariants[expected]?.includes(recognised) ? { matches: true, provisionalIrishEnglish: true, source: "built_in" } : { matches: false, provisionalIrishEnglish: false };
}

export function isIrishEnglishSupportEnabled(support: ReadingLanguageSupport) {
  return support === "IRISH_ENGLISH_SUPPORT";
}
