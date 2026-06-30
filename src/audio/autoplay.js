import { SCALES, scaleNotes } from './theory.js'

// Generative auto-player. On load, hummachine breathes on its own — a slow,
// evolving drift of held hums and the occasional phrase — until a human takes
// over. Uses the standard Web Audio lookahead scheduler so timing is rock solid.

export class AutoPlayer {
  constructor(ctx, sampler, { onNote } = {}) {
    this.ctx = ctx
    this.sampler = sampler
    this.onNote = onNote || (() => {})
    this.running = false
    this.timer = null

    this.lookahead = 0.1 // seconds of audio scheduled ahead
    this.tick = 0.025 // scheduler poll interval (s)
    this.nextTime = 0
    this.step = 0
    this.gain = 1 // faded out when a human takes over

    this.root = 50 // D
    this.scale = scaleNotes(this.root, SCALES.pentatonicMinor, 3)
    // Deterministic-ish wandering without needing Math.random everywhere.
    this.held = []
  }

  start() {
    if (this.running) return
    this.running = true
    this.nextTime = this.ctx.currentTime + 0.15
    this._loop()
  }

  stop() {
    this.running = false
    if (this.timer) clearTimeout(this.timer)
    for (const m of this.held) this.sampler.noteOff(m)
    this.held = []
  }

  // Smoothly back off when a player takes control (don't hard-cut the mood).
  fade() {
    this.gain = 0
  }

  _pick() {
    return this.scale[Math.floor(Math.random() * this.scale.length)]
  }

  _loop() {
    if (!this.running) return
    while (this.nextTime < this.ctx.currentTime + this.lookahead) {
      this._schedule(this.nextTime)
      // Slow, meditative pulse with a little swing.
      const beat = 0.55 + Math.random() * 0.25
      this.nextTime += beat
      this.step++
    }
    this.timer = setTimeout(() => this._loop(), this.tick * 1000)
  }

  _schedule(time) {
    if (this.gain <= 0) return

    // Drift the tonal center every 32 steps for slow harmonic motion.
    if (this.step % 32 === 0) {
      this.root = 45 + Math.floor(Math.random() * 8)
      this.scale = scaleNotes(this.root, SCALES.pentatonicMinor, 3)
    }

    // Release older held notes so the texture keeps breathing.
    while (this.held.length > 2) {
      const m = this.held.shift()
      this.sampler.noteOff(m, time)
    }

    const r = Math.random()
    if (r < 0.72) {
      const midi = this._pick()
      const vel = (0.25 + Math.random() * 0.3) * this.gain
      this.sampler.noteOn(midi, vel, time)
      this.held.push(midi)
      this.onNote(midi, 'auto')
      // Schedule its release for a sustained, overlapping wash.
      const dur = 0.8 + Math.random() * 1.6
      setTimeout(() => this.sampler.noteOff(midi, this.ctx.currentTime), dur * 1000)
    } else if (r < 0.85 && this.sampler.phrases.length) {
      this.sampler.playPhrase(Math.floor(Math.random() * this.sampler.phrases.length), 0.3 * this.gain, time)
    }
    // else: rest — silence is part of the piece.
  }
}
