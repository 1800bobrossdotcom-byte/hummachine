import { Sampler } from './sampler.js'
import { loadSamples } from './samples.js'
import { AutoPlayer } from './autoplay.js'
import { initMidi } from './midi.js'
import { initKeyboard } from './keyboard.js'

// The conductor. Owns the AudioContext and master chain, wires every input
// (on-screen keys, computer keyboard, MIDI) to the sampler, and runs the
// generative auto-player until a human takes over. Lives outside React.

export class Engine {
  constructor() {
    this.ctx = null
    this.sampler = null
    this.auto = null
    this.analyser = null
    this.started = false
    this.tookOver = false
    this.info = null
    this._listeners = new Set()
    this._cleanups = []
    this.activeNotes = new Set()
    this.midiStatus = 'idle'
  }

  on(fn) {
    this._listeners.add(fn)
    return () => this._listeners.delete(fn)
  }

  _emit(event) {
    for (const fn of this._listeners) fn(event)
  }

  async start() {
    if (this.started) return
    this.started = true

    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    this.ctx = ctx
    if (ctx.state === 'suspended') await ctx.resume()

    // master -> compressor (safety) -> analyser -> out
    const master = new GainNode(ctx, { gain: 0.9 })
    const comp = new DynamicsCompressorNode(ctx, {
      threshold: -18, knee: 24, ratio: 3, attack: 0.005, release: 0.2,
    })
    const analyser = new AnalyserNode(ctx, { fftSize: 2048, smoothingTimeConstant: 0.82 })
    master.connect(comp).connect(analyser).connect(ctx.destination)
    this.analyser = analyser

    const sampler = new Sampler(ctx, master)
    this.sampler = sampler
    this.info = await loadSamples(ctx, sampler)

    this.auto = new AutoPlayer(ctx, sampler, {
      onNote: (midi) => this._flash(midi),
    })
    this.auto.start()

    // Inputs route through a single takeover-aware handler.
    this._cleanups.push(
      initKeyboard({
        onNoteOn: (m, v) => this.noteOn(m, v),
        onNoteOff: (m) => this.noteOff(m),
      }),
    )
    this._cleanups.push(
      initMidi({
        onNoteOn: (m, v) => this.noteOn(m, v),
        onNoteOff: (m) => this.noteOff(m),
        onStatus: (s) => {
          this.midiStatus = s
          this._emit({ type: 'midi', status: s })
        },
      }),
    )

    this._emit({ type: 'started', info: this.info })
  }

  _takeover() {
    if (this.tookOver) return
    this.tookOver = true
    if (this.auto) this.auto.fade()
    this._emit({ type: 'takeover' })
  }

  _flash(midi) {
    this.activeNotes.add(midi)
    this._emit({ type: 'noteon', midi })
    // Auto notes self-clear so the on-screen viz doesn't stick lit.
    setTimeout(() => {
      this.activeNotes.delete(midi)
      this._emit({ type: 'noteoff', midi })
    }, 400)
  }

  noteOn(midi, velocity = 0.85) {
    if (!this.ctx) return
    this._takeover()
    this.sampler.noteOn(midi, velocity)
    this.activeNotes.add(midi)
    this._emit({ type: 'noteon', midi })
  }

  noteOff(midi) {
    if (!this.ctx) return
    this.sampler.noteOff(midi)
    this.activeNotes.delete(midi)
    this._emit({ type: 'noteoff', midi })
  }

  dispose() {
    this._cleanups.forEach((fn) => fn())
    this._cleanups = []
    if (this.auto) this.auto.stop()
    if (this.sampler) this.sampler.allOff()
    if (this.ctx) this.ctx.close()
  }
}
