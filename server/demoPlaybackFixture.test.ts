import { describe, expect, it } from "vitest";
import { createDemoPlaybackTone } from "./demoPlaybackFixture";

describe("local playback fixture", () => {
  it("creates a valid PCM WAV header for technical word-seek validation", () => {
    const tone = createDemoPlaybackTone(1, 8_000);
    expect(tone.subarray(0, 4).toString()).toBe("RIFF");
    expect(tone.subarray(8, 12).toString()).toBe("WAVE");
    expect(tone.length).toBe(16_044);
  });
});
