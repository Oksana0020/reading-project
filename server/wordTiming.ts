import type { StoredWordTiming } from "../drizzle/schema";

type TranscriptSegment = { start: number; end: number; text: string };
const wordPattern = /[a-zA-Z]+(?:'[a-zA-Z]+)?/g;
const tokens = (text: string) => text.match(wordPattern) ?? [];

/**
 * Whisper returns timestamped segments rather than native per-word timestamps.
 * This splits each segment evenly across its spoken tokens so authorised playback can seek to the corresponding audio moment.
 */
export function buildWordTimings(transcript: string, durationSeconds: number, segments: TranscriptSegment[] = []): StoredWordTiming[] {
  const usableSegments = segments.filter(segment => segment.end > segment.start && tokens(segment.text).length > 0);
  const groups = usableSegments.length ? usableSegments.map(segment => ({ words: tokens(segment.text), startMs: Math.max(0, Math.round(segment.start * 1000)), endMs: Math.max(0, Math.round(segment.end * 1000)) })) : [{ words: tokens(transcript), startMs: 0, endMs: Math.max(1_000, durationSeconds * 1_000) }];
  let index = 0;
  return groups.flatMap(group => {
    const span = Math.max(group.words.length, group.endMs - group.startMs);
    return group.words.map((text, wordIndex) => {
      const startMs = Math.round(group.startMs + ((group.endMs - group.startMs) * wordIndex) / group.words.length);
      const endMs = Math.max(startMs + 80, Math.round(group.startMs + ((group.endMs - group.startMs) * (wordIndex + 1)) / group.words.length));
      const timing: StoredWordTiming = { id: `spoken-${index}`, text, startMs: Math.min(startMs, group.endMs), endMs: Math.min(endMs, group.endMs || span) };
      index += 1;
      return timing;
    });
  });
}
