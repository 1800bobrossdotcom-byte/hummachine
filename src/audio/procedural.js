import { midiToFreq } from './theory.js'

// Placeholder voice. Until real humming samples are dropped into src/samples/,
// the sampler is fed these synthesized "mmm" tones so the instrument is fully
// playable right now. They are rendered as steady, loopable AudioBuffers so the
// playback path is IDENTICAL to real samples — swapping in your hums changes the
// sound but not a single line of engine code.

// Voiced "hum": strong fundamental, quickly decaying harmonics (dark, like a
// closed-mouth hum), gentle vibrato, and a whisper of breath noise.
export function makeHumBuffer(ctx, midi, dur = 2.0) {
  const sr = ctx.sampleRate
  const len = Math.floor(sr * dur)
  const buf = ctx.createBuffer(1, len, sr)
  const data = buf.getChannelData(0)
  const f0 = midiToFreq(midi)

  const harmonics = [
    [1, 1.0], [2, 0.45], [3, 0.22], [4, 0.1], [5, 0.05], [6, 0.025],
  ]
  const vibRate = 5.0
  const vibDepth = 0.005
  // Slowly wandering breath amplitude makes it feel human, not synthetic.
  const breathRate = 0.7

  for (let i = 0; i < len; i++) {
    const t = i / sr
    const vib = 1 + vibDepth * Math.sin(2 * Math.PI * vibRate * t)
    let s = 0
    for (const [h, a] of harmonics) {
      s += a * Math.sin(2 * Math.PI * f0 * h * vib * t)
    }
    const breath = 0.012 * (0.6 + 0.4 * Math.sin(2 * Math.PI * breathRate * t))
    s += (Math.random() * 2 - 1) * breath

    // Tiny fade at the very edges to avoid loop clicks; otherwise steady.
    let edge = 1
    const fade = 0.008
    if (t < fade) edge = t / fade
    else if (t > dur - fade) edge = (dur - t) / fade

    data[i] = s * 0.2 * edge
  }
  return buf
}

// A short generative phrase, rendered to a single buffer, used as the placeholder
// "phrase / loop" layer. Real hummed phrases will replace these.
export function makePhraseBuffer(ctx, rootMidi, steps, dur = 0.36) {
  const sr = ctx.sampleRate
  const total = Math.floor(sr * dur * steps.length)
  const buf = ctx.createBuffer(1, total, sr)
  const data = buf.getChannelData(0)
  const stepLen = Math.floor(sr * dur)

  steps.forEach((interval, si) => {
    const f0 = midiToFreq(rootMidi + interval)
    const offset = si * stepLen
    for (let i = 0; i < stepLen && offset + i < total; i++) {
      const t = i / sr
      const env = Math.min(1, t / 0.02) * Math.exp(-t * 3.2)
      let s = Math.sin(2 * Math.PI * f0 * t)
      s += 0.4 * Math.sin(2 * Math.PI * f0 * 2 * t)
      data[offset + i] = s * env * 0.16
    }
  })
  return buf
}
