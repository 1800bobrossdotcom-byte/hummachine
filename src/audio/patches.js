import { defaultModuleParams, DEFAULT_CABLES, CORE_CHAIN } from './modules.js'

// Core audio chain + one modulation cable, for presets that only rewire the mod.
const withMod = (...mod) => [...CORE_CHAIN.map((c) => [...c]), ...mod]

// Patch storage for the modular. A patch captures BOTH knob values (per module)
// and the full cable routing, so recalling a patch rebuilds the whole instrument.
// Factory presets are always present; user patches persist to localStorage when
// available (NFT iframes can sandbox it — we fall back to an in-memory list).

const KEY = 'hummachine.patches.v2'
let memory = null

// Factory presets: partial param overrides + optional cable rewires.
export const FACTORY_PATCHES = [
  { name: 'INIT', factory: true },
  {
    name: 'CATHEDRAL',
    factory: true,
    params: { vcf: { cutoff: 8000, fm: 0.08 }, reverb: { mix: 0.72 }, lfo: { rate: 0.4 } },
  },
  {
    name: 'DUB ECHO',
    factory: true,
    params: { delay: { mix: 0.55, feedback: 0.62, time: 0.4 }, reverb: { mix: 0.2 }, vcf: { cutoff: 6500 } },
  },
  {
    name: 'WOBBLE',
    factory: true,
    params: { lfo: { rate: 5 }, vcf: { cutoff: 2800, res: 9, fm: 0.7 } },
  },
  {
    name: 'GRIT',
    factory: true,
    params: { drive: { drive: 0.55 }, vcf: { cutoff: 5200, res: 5 }, reverb: { mix: 0.22 } },
  },
  {
    // Repatch: LFO drives the VCA for tremolo instead of the filter.
    name: 'TREMOLO',
    factory: true,
    params: { lfo: { rate: 6 }, vca: { cv: 0.85, level: 0.7 } },
    cables: withMod(['lfo.out', 'vca.cv']),
  },
  {
    // Sample & Hold steps the filter — burbling, generative.
    name: 'S&H RAND',
    factory: true,
    params: { sh: { rate: 7 }, vcf: { cutoff: 2600, res: 7, fm: 0.6 } },
    cables: withMod(['sh.out', 'vcf.fm']),
  },
  {
    // Slow 2nd LFO drifts the cutoff for a breathing pad.
    name: 'SLOW DRIFT',
    factory: true,
    params: { lfo2: { rate: 0.18, shape: 0 }, vcf: { cutoff: 5000, fm: 0.4 } },
    cables: withMod(['lfo2.out', 'vcf.fm']),
  },
  {
    // Envelope sweeps the filter as you play — plucky, vocal.
    name: 'ENV SWEEP',
    factory: true,
    params: { env: { a: 0.25, d: 0.6, s: 0.35, r: 1.2 }, vcf: { cutoff: 900, res: 6, fm: 0.7 } },
    cables: withMod(['env.out', 'vcf.fm']),
  },
]

// Deep-merge a patch's partial params onto the full default set.
export function patchState(patch) {
  const params = defaultModuleParams()
  for (const [modId, kv] of Object.entries(patch.params || {})) {
    params[modId] = { ...params[modId], ...kv }
  }
  const cables = patch.cables ? patch.cables.map((c) => [...c]) : DEFAULT_CABLES.map((c) => [...c])
  return { params, cables }
}

function readUser() {
  if (memory) return memory
  try {
    const raw = localStorage.getItem(KEY)
    memory = raw ? JSON.parse(raw) : []
  } catch {
    memory = []
  }
  return memory
}

function writeUser(list) {
  memory = list
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* sandboxed — keep it in memory for this session */
  }
}

export function listPatches() {
  return [...FACTORY_PATCHES, ...readUser()]
}

export function savePatch(name, state) {
  const list = readUser()
  const clean = (name || '').trim() || `PATCH ${list.length + 1}`
  const entry = {
    name: clean,
    factory: false,
    params: state.params,
    cables: state.cables.map((c) => [...c]),
  }
  const existing = list.findIndex((p) => p.name.toUpperCase() === clean.toUpperCase())
  if (existing >= 0) list[existing] = entry
  else list.push(entry)
  writeUser(list)
  return clean
}

export function deletePatch(name) {
  writeUser(readUser().filter((p) => p.name !== name))
}
