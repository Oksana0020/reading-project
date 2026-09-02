/** Builds a short, non-speech WAV tone used only to validate local demo seek controls. */
export function createDemoPlaybackTone(durationSeconds = 3, sampleRate = 8_000) {
  const sampleCount = durationSeconds * sampleRate;
  const buffer = Buffer.alloc(44 + sampleCount * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + sampleCount * 2, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(sampleCount * 2, 40);
  for (let index = 0; index < sampleCount; index += 1) {
    const frequency = index < sampleRate ? 330 : index < sampleRate * 2 ? 440 : 550;
    buffer.writeInt16LE(Math.round(Math.sin((2 * Math.PI * frequency * index) / sampleRate) * 1800), 44 + index * 2);
  }
  return buffer;
}
