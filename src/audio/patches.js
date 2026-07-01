import { defaultModuleParams, DEFAULT_CABLES } from './modules.js'

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
    // Demonstrates repatching: LFO drives the VCA for tremolo instead of the filter.
    name: 'TREMOLO',
    factory: true,
    params: { lfo: { rate: 6 }, vca: { cv: 0.85, level: 0.7 } },
    cables: [
      ['voice.out', 'vcf.in'], ['vcf.out', 'drive.in'], ['drive.out', 'delay.in'],
      ['delay.out', 'reverb.in'], ['reverb.out', 'vca.in'], ['vca.out', 'out.in'],
      ['lfo.out', 'vca.cv'],
    ],
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
