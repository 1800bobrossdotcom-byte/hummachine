// Small DSP helpers for the effects chain.

// Generated reverb impulse (exponentially-decaying stereo noise). Avoids
// shipping an external IR file, keeping the token self-contained.
export function makeReverbImpulse(ctx, seconds = 2.6, decay = 2.4) {
  const sr = ctx.sampleRate
  const len = Math.floor(sr * seconds)
  const impulse = ctx.createBuffer(2, len, sr)
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch)
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
    }
  }
  return impulse
}

// Waveshaper curve for DRIVE. amount 0 → near-linear, 1 → hard tanh saturation.
export function makeDriveCurve(amount) {
  const n = 1024
  const curve = new Float32Array(n)
  const k = amount * 100 + 0.0001
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x))
  }
  return curve
}
