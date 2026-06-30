import { Sampler } from './sampler.js'
import { loadSamples } from './samples.js'
import { AutoPlayer } from './autoplay.js'
import { initMidi } from './midi.js'
import { initKeyboard } from './keyboard.js'
import { makeReverbImpulse, makeDriveCurve } from './fx.js'
import { defaultParams } from './params.js'

// The conductor. Owns the AudioContext, the full effects chain, and all input
// routing; runs the generative auto-player until a human takes over. Parameters
// (filter, drive, reverb, delay, vibrato, envelope, volume) are applied live.
//
// Signal flow:
//   sampler -> voiceBus -> drive -> filter ┬─> dry ───────────────┐
//                                          ├─> reverb -> revWet ──┤-> master -> comp -> analyser -> out
//                                          └─> delay  -> delWet ──┘
//   (delay feeds back through `feedback`; vibrato LFO modulates voice detune)

export class Engine {
  constructor() {
    this.ctx = null
    this.sampler = null
    this.auto = null
    this.analyser = null
    this.started = false
    this.tookOver = false
    this.info = null
    this.params = defaultParams()
    this.nodes = {}
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

  async start(initialParams) {
    if (this.started) return
    this.started = true
    if (initialParams) this.params = { ...this.params, ...initialParams }

    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    this.ctx = ctx
    if (ctx.state === 'suspended') await ctx.resume()

    // ── Effects chain ──────────────────────────────────────────────────────
    const voiceBus = new GainNode(ctx, { gain: 1 })
    const drive = new WaveShaperNode(ctx, { oversample: '2x' })
    const filter = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 16000, Q: 0.8 })

    const dry = new GainNode(ctx, { gain: 1 })

    const reverb = new ConvolverNode(ctx, { buffer: makeReverbImpulse(ctx) })
    const revWet = new GainNode(ctx, { gain: 0 })

    const delay = new DelayNode(ctx, { maxDelayTime: 1.0, delayTime: 0.3 })
    const feedback = new GainNode(ctx, { gain: 0 })
    const delWet = new GainNode(ctx, { gain: 0 })

    const master = new GainNode(ctx, { gain: 0.85 })
    const comp = new DynamicsCompressorNode(ctx, {
      threshold: -16, knee: 24, ratio: 3, attack: 0.005, release: 0.2,
    })
    const analyser = new AnalyserNode(ctx, { fftSize: 2048, smoothingTimeConstant: 0.82 })

    voiceBus.connect(drive)
    drive.connect(filter)
    filter.connect(dry).connect(master)
    filter.connect(reverb).connect(revWet).connect(master)
    filter.connect(delay)
    delay.connect(feedback).connect(delay) // feedback loop
    delay.connect(delWet).connect(master)
    master.connect(comp).connect(analyser).connect(ctx.destination)

    // ── Vibrato LFO ────────────────────────────────────────────────────────
    const lfo = new OscillatorNode(ctx, { frequency: 5 })
    const vibDepth = new GainNode(ctx, { gain: 0 }) // gain == cents of detune
    lfo.connect(vibDepth)
    lfo.start()

    this.analyser = analyser
    this.nodes = { voiceBus, drive, filter, dry, reverb, revWet, delay, feedback, delWet, master, lfo, vibDepth }

    // ── Sampler ────────────────────────────────────────────────────────────
    const sampler = new Sampler(ctx, voiceBus)
    sampler.modSource = vibDepth
    this.sampler = sampler
    this.info = await loadSamples(ctx, sampler)

    // Apply the initial patch to the freshly-built graph.
    this.applyParams(this.params)

    // ── Generative auto-player ─────────────────────────────────────────────
    this.auto = new AutoPlayer(ctx, sampler, { onNote: (midi) => this._flash(midi) })
    this.auto.start()

    // ── Inputs ─────────────────────────────────────────────────────────────
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

  // ── Parameter application ──────────────────────────────────────────────────
  setParam(key, value) {
    this.params[key] = value
    this._applyOne(key, value)
  }

  applyParams(params) {
    this.params = { ...this.params, ...params }
    for (const key of Object.keys(this.params)) this._applyOne(key, this.params[key])
  }

  _applyOne(key, value) {
    const n = this.nodes
    const ctx = this.ctx
    if (!ctx) return
    const t = ctx.currentTime
    const ramp = (param, v) => param.setTargetAtTime(v, t, 0.02)
    switch (key) {
      case 'volume': ramp(n.master.gain, value); break
      case 'cutoff': ramp(n.filter.frequency, value); break
      case 'resonance': ramp(n.filter.Q, value); break
      case 'attack': this.sampler.attack = value; break
      case 'release': this.sampler.release = value; break
      case 'drive': n.drive.curve = makeDriveCurve(value); break
      case 'reverb': ramp(n.revWet.gain, value); break
      case 'delay': ramp(n.delWet.gain, value); break
      case 'delayTime': ramp(n.delay.delayTime, value); break
      case 'feedback': ramp(n.feedback.gain, value); break
      case 'vibRate': ramp(n.lfo.frequency, value); break
      case 'vibDepth': ramp(n.vibDepth.gain, value); break
      default: break
    }
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
