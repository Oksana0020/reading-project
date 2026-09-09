export type ReadingEvidenceWord = {
  attempts: number;
};

export function hasChildReadingEvidence(transcript: string, wordStates: ReadingEvidenceWord[]) {
  return transcript.trim().split(/\s+/).filter(Boolean).length > 0 || wordStates.some(word => word.attempts > 0);
}
