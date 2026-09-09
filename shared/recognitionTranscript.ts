export function appendRecognitionTranscript(existingTranscript: string, recognitionSegment: string) {
  return `${existingTranscript.trim()} ${recognitionSegment.trim()}`.trim().replace(/\s+/g, " ");
}
