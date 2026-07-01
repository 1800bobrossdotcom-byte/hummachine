import { MODULES, CV_RANGE } from './modules.js'
import { makeReverbImpulse, makeDriveCurve } from './fx.js'

// The modular audio graph. Builds one node-bundle per module spec, exposes every
// jack as a connectable node, and connects/disconnects patch cables live.
//
// Clean repatching trick: every jack is a GainNode. An audio OUT is a gain the
// module feeds; an audio IN is a gain that feeds the module. A cable is simply
// out.connect(in) / out.disconnect(in) — so multiple cables and later removal
// never disturb unrelated connections. CV inputs are attenuators pre-wired to
// their target AudioParam; patching a CV cable just feeds the attenuator.

export class Modular {
  constructor(ctx) {
    this.ctx = ctx
    this.mods = new Map() // id -> bundle
    this.jacks = new Map() // "mod.jack" -> { node, kind, signal }
    this.cables = new Map() // "from|to" -> { from, to }
    this.analyser = null
    this.voiceInput = null // node the sampler connects into
    this._timers = [] // cleanup thunks (e.g. S&H interval)
    this._build()
  }

  jackId(mod, jack) {
    return `${mod}.${jack}`
  }

  _registerJacks(spec, nodes) {
    for (const j of spec.jacks) {
      this.jacks.set(this.jackId(spec.id, j.name), {
        node: nodes[j.name],
        kind: j.kind,
        signal: j.signal,
      })
    }
  }

  _build() {
    const ctx = this.ctx
    for (const spec of MODULES) {
      const bundle = this._buildModule(spec)
      this.mods.set(spec.id, bundle)
      this._registerJacks(spec, bundle.jacks)
    }
    this.analyser = this.mods.get('out').analyser
    this.voiceInput = this.mods.get('voice').input
  }

  _buildModule(spec) {
    const ctx = this.ctx
    const g = (v = 1) => new GainNode(ctx, { gain: v })
    switch (spec.type) {
      case 'voice': {
        const input = g(1) // sampler feeds here
        const out = g(1)
        input.connect(out)
        return { input, out, jacks: { out }, set: (k, v) => k === 'level' && input.gain.setTargetAtTime(v, ctx.currentTime, 0.02) }
      }
      case 'lfo': {
        const waves = ['sine', 'triangle', 'square', 'sawtooth']
        const osc = new OscillatorNode(ctx, { type: 'sine', frequency: 4 })
        const out = g(1)
        osc.connect(out)
        osc.start()
        return {
          osc, out, jacks: { out },
          set: (k, v) => {
            if (k === 'rate') osc.frequency.setTargetAtTime(v, ctx.currentTime, 0.02)
            else if (k === 'shape') osc.type = waves[Math.round(v)] || 'sine'
          },
        }
      }
      case 'env': {
        // ADSR envelope as a ConstantSource driven by the note gate.
        const cs = new ConstantSourceNode(ctx, { offset: 0 })
        const out = g(1)
        cs.connect(out)
        cs.start()
        const p = { a: 0.02, d: 0.3, s: 0.6, r: 0.5 }
        const tc = (x) => Math.max(0.001, x / 3) // exp time-constant approx
        return {
          out, cs, jacks: { out },
          set: (k, v) => { if (k in p) p[k] = v },
          gateOn: () => {
            const t = ctx.currentTime
            cs.offset.cancelScheduledValues(t)
            cs.offset.setTargetAtTime(1, t, tc(p.a))
            cs.offset.setTargetAtTime(p.s, t + p.a, tc(p.d))
          },
          gateOff: () => {
            const t = ctx.currentTime
            cs.offset.cancelScheduledValues(t)
            cs.offset.setTargetAtTime(0, t, tc(p.r))
          },
        }
      }
      case 'sh': {
        // Sample & hold: stepped random CV, re-sampled at RATE.
        const cs = new ConstantSourceNode(ctx, { offset: 0 })
        const out = g(1)
        cs.connect(out)
        cs.start()
        const state = { rate: 5, timer: null }
        const tick = () => cs.offset.setValueAtTime(Math.random() * 2 - 1, ctx.currentTime)
        const arm = () => {
          if (state.timer) clearInterval(state.timer)
          state.timer = setInterval(tick, 1000 / state.rate)
        }
        arm()
        this._timers.push(() => state.timer && clearInterval(state.timer))
        return { out, cs, jacks: { out }, set: (k, v) => { if (k === 'rate') { state.rate = v; arm() } } }
      }
      case 'mix': {
        const out = g(1)
        const in1 = g(0.7), in2 = g(0.7), in3 = g(0.7)
        in1.connect(out); in2.connect(out); in3.connect(out)
        return {
          out, jacks: { in1, in2, in3, out },
          set: (k, v) => {
            if (k === 'lvl1') in1.gain.setTargetAtTime(v, ctx.currentTime, 0.02)
            else if (k === 'lvl2') in2.gain.setTargetAtTime(v, ctx.currentTime, 0.02)
            else if (k === 'lvl3') in3.gain.setTargetAtTime(v, ctx.currentTime, 0.02)
          },
        }
      }
      case 'mult': {
        // Passive multiple: one input copied to three outputs.
        const input = g(1)
        const out1 = g(1), out2 = g(1), out3 = g(1)
        input.connect(out1); input.connect(out2); input.connect(out3)
        return { jacks: { in: input, out1, out2, out3 }, set: () => {} }
      }
      case 'vcf': {
        const input = g(1)
        const out = g(1)
        const biquad = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 12000, Q: 3 })
        const fm = g(0) // attenuator -> frequency
        input.connect(biquad).connect(out)
        fm.connect(biquad.frequency)
        return {
          input, out, biquad, fm,
          jacks: { in: input, out, fm },
          set: (k, v) => {
            if (k === 'cutoff') biquad.frequency.setTargetAtTime(v, ctx.currentTime, 0.02)
            else if (k === 'res') biquad.Q.setTargetAtTime(v, ctx.currentTime, 0.02)
            else if (k === 'fm') fm.gain.setTargetAtTime(v * CV_RANGE['vcf.fm'], ctx.currentTime, 0.02)
          },
        }
      }
      case 'drive': {
        const input = g(1)
        const out = g(1)
        const shaper = new WaveShaperNode(ctx, { oversample: '2x', curve: makeDriveCurve(0.08) })
        input.connect(shaper).connect(out)
        return { input, out, shaper, jacks: { in: input, out }, set: (k, v) => k === 'drive' && (shaper.curve = makeDriveCurve(v)) }
      }
      case 'delay': {
        const input = g(1)
        const out = g(1)
        const dry = g(1)
        const delay = new DelayNode(ctx, { maxDelayTime: 1.2, delayTime: 0.28 })
        const feedback = g(0.32)
        const wet = g(0)
        input.connect(dry).connect(out)
        input.connect(delay)
        delay.connect(feedback).connect(delay)
        delay.connect(wet).connect(out)
        return {
          input, out, delay, feedback, wet,
          jacks: { in: input, out },
          set: (k, v) => {
            if (k === 'time') delay.delayTime.setTargetAtTime(v, ctx.currentTime, 0.02)
            else if (k === 'feedback') feedback.gain.setTargetAtTime(v, ctx.currentTime, 0.02)
            else if (k === 'mix') wet.gain.setTargetAtTime(v, ctx.currentTime, 0.02)
          },
        }
      }
      case 'reverb': {
        const input = g(1)
        const out = g(1)
        const dry = g(1)
        const conv = new ConvolverNode(ctx, { buffer: makeReverbImpulse(ctx) })
        const wet = g(0)
        input.connect(dry).connect(out)
        input.connect(conv).connect(wet).connect(out)
        return { input, out, wet, jacks: { in: input, out }, set: (k, v) => k === 'mix' && wet.gain.setTargetAtTime(v, ctx.currentTime, 0.02) }
      }
      case 'vca': {
        const input = g(1)
        const out = g(1)
        const vca = g(1)
        const cv = g(0) // attenuator -> vca.gain
        input.connect(vca).connect(out)
        cv.connect(vca.gain)
        return {
          input, out, vca, cv,
          jacks: { in: input, out, cv },
          set: (k, v) => {
            if (k === 'level') vca.gain.setTargetAtTime(v, ctx.currentTime, 0.02)
            else if (k === 'cv') cv.gain.setTargetAtTime(v * CV_RANGE['vca.cv'], ctx.currentTime, 0.02)
          },
        }
      }
      case 'out': {
        const input = g(0.85)
        const comp = new DynamicsCompressorNode(ctx, { threshold: -16, knee: 24, ratio: 3, attack: 0.005, release: 0.2 })
        const analyser = new AnalyserNode(ctx, { fftSize: 2048, smoothingTimeConstant: 0.82 })
        input.connect(comp).connect(analyser).connect(ctx.destination)
        return { input, analyser, jacks: { in: input }, set: (k, v) => k === 'vol' && input.gain.setTargetAtTime(v, ctx.currentTime, 0.02) }
      }
      default:
        return { jacks: {}, set: () => {} }
    }
  }

  // ── Gate (drives envelope modules) ─────────────────────────────────────────
  gateOn() {
    for (const m of this.mods.values()) if (m.gateOn) m.gateOn()
  }

  gateOff() {
    for (const m of this.mods.values()) if (m.gateOff) m.gateOff()
  }

  dispose() {
    this._timers.forEach((fn) => fn())
    this._timers = []
  }

  // ── Params ────────────────────────────────────────────────────────────────
  setParam(modId, key, value) {
    const m = this.mods.get(modId)
    if (m) m.set(key, value)
  }

  applyParams(params) {
    for (const [modId, kv] of Object.entries(params || {})) {
      for (const [k, v] of Object.entries(kv)) this.setParam(modId, k, v)
    }
  }

  // ── Cables ──────────────────────────────────────────────────────────────
  _key(from, to) {
    return `${from}|${to}`
  }

  addCable(from, to) {
    const a = this.jacks.get(from)
    const b = this.jacks.get(to)
    if (!a || !b) return false
    const key = this._key(from, to)
    if (this.cables.has(key)) return false
    try {
      a.node.connect(b.node)
    } catch {
      return false
    }
    this.cables.set(key, { from, to })
    return true
  }

  removeCable(from, to) {
    const key = this._key(from, to)
    if (!this.cables.has(key)) return
    const a = this.jacks.get(from)
    const b = this.jacks.get(to)
    try {
      a.node.disconnect(b.node)
    } catch {
      /* already gone */
    }
    this.cables.delete(key)
  }

  clearCables() {
    for (const { from, to } of [...this.cables.values()]) this.removeCable(from, to)
  }

  setCables(list) {
    this.clearCables()
    for (const [from, to] of list) this.addCable(from, to)
  }
}
