import { describe, expect, it } from "vitest";
import { buildWordTimings } from "./wordTiming";

describe("word-linked playback timing", () => {
  it("derives an ordered timing for every spoken token inside Whisper segments", () => {
    const timings = buildWordTimings("Amina reads", 4, [{ start: 1, end: 3, text: "Amina reads" }]);
    expect(timings).toEqual([{ id: "spoken-0", text: "Amina", startMs: 1000, endMs: 2000 }, { id: "spoken-1", text: "reads", startMs: 2000, endMs: 3000 }]);
  });

  it("uses the recorded duration when only a guided transcript is available", () => {
    const timings = buildWordTimings("Read slowly", 6);
    expect(timings).toHaveLength(2);
    expect(timings[0]?.startMs).toBe(0);
    expect(timings[1]?.endMs).toBe(6000);
  });
});
