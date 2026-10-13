// Generates synthetic demo audio (max 30s per track, original synthesized tones).
// No real music is used; catalog data is fictional. Files are committed as assets.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const sampleRate = 22050;
const outDir = 'apps/web/public/demo';
mkdirSync(outDir, { recursive: true });

// 5-note motif per track with distinct scale roots so tracks are audibly different.
const scales = {
  A: [220.0, 261.63, 293.66, 329.63, 392.0],
  B: [196.0, 233.08, 261.63, 311.13, 349.23],
  C: [174.61, 220.0, 246.94, 293.66, 329.63],
  D: [164.81, 196.0, 246.94, 261.63, 311.13],
  E: [246.94, 293.66, 329.63, 392.0, 440.0],
  F: [146.83, 174.61, 220.0, 233.08, 293.66],
  G: [261.63, 311.13, 349.23, 392.0, 466.16],
  H: [207.65, 246.94, 277.18, 311.13, 369.99],
};
const noteSeconds = 2.5;
const lengthSeconds = 30;

for (const [key, freqs] of Object.entries(scales)) {
  const total = sampleRate * lengthSeconds;
  const samples = new Float64Array(total);
  for (let i = 0; i < total; i++) {
    const t = i / sampleRate;
    const noteIndex = Math.floor(t / noteSeconds) % freqs.length;
    const noteT = t % noteSeconds;
    const freq = freqs[noteIndex];
    const envelope = Math.min(1, noteT * 8) * Math.exp(-1.4 * noteT);
    const vibrato = 1 + 0.004 * Math.sin(2 * Math.PI * 5.5 * t);
    let sample = Math.sin(2 * Math.PI * freq * vibrato * t) * envelope;
    sample += 0.35 * Math.sin(2 * Math.PI * freq * 2 * t) * envelope; // harmonic
    const beat = t % 0.625 < 0.05 ? 0.5 : 0; // soft percussive click
    sample += beat * Math.exp(-40 * (t % 0.625));
    samples[i] = sample * 0.55;
  }
  const pcm = Buffer.alloc(total * 2);
  for (let i = 0; i < total; i++) pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), i * 2);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + pcm.length, 4); header.write('WAVE', 8);
  header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24); header.writeUInt32LE(sampleRate * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write('data', 36); header.writeUInt32LE(pcm.length, 40);
  writeFileSync(join(outDir, `track-${key.toLowerCase()}.wav`), Buffer.concat([header, pcm]));
  console.log(`wrote track-${key.toLowerCase()}.wav (${lengthSeconds}s)`);
}
