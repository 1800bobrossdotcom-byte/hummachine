import { Sampler } from './sampler.js'
import { loadSamples } from './samples.js'
import { AutoPlayer } from './autoplay.js'
import { initMidi } from './midi.js'
import { initKeyboard } from './keyboard.js'
import { Modular } from './modular.js'
import { defaultModuleParams, DEFAULT_CABLES } from './modules.js'

// The conductor. Owns the AudioContext, the modular graph, the polyphonic
// sampler, and all input routing; runs the generative auto-player until a human
// takes over. The signal path is whatever the patch cables say it is.

export class Engine {
  constructor() {
    this.ctx = null
    this.sampler = null
    this.auto = null
    this.modular = null
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

  async start(initialState) {
    if (this.started) return
    this.started = true

    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    this.ctx = ctx
    if (ctx.state === 'suspended') await ctx.resume()

    // Build the modular rack and wire the sampler into the VOICES module.
    const modular = new Modular(ctx)
    this.modular = modular
    this.analyser = modular.analyser

    const sampler = new Sampler(ctx, modular.voiceInput)
    this.sampler = sampler
    this.info = await loadSamples(ctx, sampler)

    // Apply the starting patch (params + cabling).
    const params = initialState?.params || defaultModuleParams()
    const cables = initialState?.cables || DEFAULT_CABLES
    modular.applyParams(params)
    modular.setCables(cables)

    // Generative auto-player.
    this.auto = new AutoPlayer(ctx, sampler, { onNote: (midi) => this._flash(midi) })
    this.auto.start()

    // Inputs.
    this._cleanups.push(
      initKeyboard({ onNoteOn: (m, v) => this.noteOn(m, v), onNoteOff: (m) => this.noteOff(m) }),
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

  // ── Modular controls (delegated) ───────────────────────────────────────────
  setParam(modId, key, value) {
    if (this.modular) this.modular.setParam(modId, key, value)
  }

  applyState(state) {
    if (!this.modular) return
    if (state.params) this.modular.applyParams(state.params)
    if (state.cables) this.modular.setCables(state.cables)
  }

  addCable(from, to) {
    return this.modular ? this.modular.addCable(from, to) : false
  }

  removeCable(from, to) {
    if (this.modular) this.modular.removeCable(from, to)
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
