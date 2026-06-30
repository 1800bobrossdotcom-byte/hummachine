// Polyphonic sampler. Holds a set of pitched note buffers and plays any MIDI note
// by pitch-shifting the nearest sample (classic multisample interpolation). Also
// holds "phrase" buffers that can be triggered/layered on top.

export class Sampler {
  constructor(ctx, destination) {
    this.ctx = ctx
    this.dest = destination
    this.notes = [] // sorted [{ midi, buffer }]
    this.phrases = [] // [{ buffer }]
    this.voices = new Map() // midi -> { src, gain }
    this.attack = 0.02
    this.release = 0.4
    this.modSource = null // vibrato LFO -> connected to each voice's detune
  }

  addNote(midi, buffer) {
    this.notes.push({ midi, buffer })
    this.notes.sort((a, b) => a.midi - b.midi)
  }

  addPhrase(buffer) {
    this.phrases.push({ buffer })
  }

  get ready() {
    return this.notes.length > 0
  }

  _nearest(midi) {
    let best = this.notes[0]
    let bestDist = Infinity
    for (const n of this.notes) {
      const d = Math.abs(n.midi - midi)
      if (d < bestDist) {
        bestDist = d
        best = n
      }
    }
    return best
  }

  noteOn(midi, velocity = 0.8, when = 0) {
    if (!this.ready) return
    const ctx = this.ctx
    const t = when || ctx.currentTime
    // Retrigger: release any voice already on this note.
    if (this.voices.has(midi)) this.noteOff(midi, t)

    const sample = this._nearest(midi)
    const rate = Math.pow(2, (midi - sample.midi) / 12)

    const src = ctx.createBufferSource()
    src.buffer = sample.buffer
    src.loop = true
    src.playbackRate.value = rate
    // Vibrato: the shared LFO modulates each voice's detune (in cents).
    if (this.modSource) this.modSource.connect(src.detune)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.02, velocity), t + this.attack)

    src.connect(gain).connect(this.dest)
    src.start(t)
    this.voices.set(midi, { src, gain })
  }

  noteOff(midi, when = 0) {
    const voice = this.voices.get(midi)
    if (!voice) return
    const ctx = this.ctx
    const t = when || ctx.currentTime
    const { src, gain } = voice
    gain.gain.cancelScheduledValues(t)
    gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + this.release)
    src.stop(t + this.release + 0.05)
    this.voices.delete(midi)
  }

  // Fire a one-shot phrase (or held drone via the note path). Used by autoplay.
  playPhrase(index = 0, velocity = 0.5, when = 0) {
    if (this.phrases.length === 0) return
    const ctx = this.ctx
    const t = when || ctx.currentTime
    const phrase = this.phrases[index % this.phrases.length]
    const src = ctx.createBufferSource()
    src.buffer = phrase.buffer
    const gain = ctx.createGain()
    gain.gain.value = velocity
    src.connect(gain).connect(this.dest)
    src.start(t)
  }

  allOff() {
    for (const midi of [...this.voices.keys()]) this.noteOff(midi)
  }
}
