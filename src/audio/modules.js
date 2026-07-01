// Static description of the modular rack. Both the audio graph (modular.js) and
// the UI (Rack/Module components) are driven from these specs, so a module only
// needs to be described once.
//
// Each module: { id, title, type, group, jacks[], params[] }
//   jack:  { name, kind: 'in'|'out', signal: 'audio'|'cv' }
//   param: { key, label, min, max, def, curve, unit }  OR  { key, label, steps[], def }
//
// A jack's global id is `${moduleId}.${jackName}` (e.g. "vcf.in").

const WAVES = ['SIN', 'TRI', 'SQR', 'SAW']

export const MODULES = [
  {
    id: 'voice', title: 'VOICES', type: 'voice', group: 'source',
    jacks: [{ name: 'out', kind: 'out', signal: 'audio' }],
    params: [{ key: 'level', label: 'LEVEL', min: 0, max: 1.5, def: 1, curve: 'lin' }],
  },
  {
    id: 'env', title: 'ENV', type: 'env', group: 'mod',
    jacks: [{ name: 'out', kind: 'out', signal: 'cv' }],
    params: [
      { key: 'a', label: 'ATK', min: 0.002, max: 2, def: 0.02, curve: 'log', unit: 's' },
      { key: 'd', label: 'DEC', min: 0.01, max: 2, def: 0.3, curve: 'log', unit: 's' },
      { key: 's', label: 'SUS', min: 0, max: 1, def: 0.6, curve: 'lin' },
      { key: 'r', label: 'REL', min: 0.02, max: 3, def: 0.5, curve: 'log', unit: 's' },
    ],
  },
  {
    id: 'lfo', title: 'LFO', type: 'lfo', group: 'mod',
    jacks: [{ name: 'out', kind: 'out', signal: 'cv' }],
    params: [
      { key: 'rate', label: 'RATE', min: 0.02, max: 12, def: 4, curve: 'log', unit: 'hz' },
      { key: 'shape', label: 'SHAPE', steps: WAVES, def: 0 },
    ],
  },
  {
    id: 'lfo2', title: 'LFO 2', type: 'lfo', group: 'mod',
    jacks: [{ name: 'out', kind: 'out', signal: 'cv' }],
    params: [
      { key: 'rate', label: 'RATE', min: 0.02, max: 12, def: 0.8, curve: 'log', unit: 'hz' },
      { key: 'shape', label: 'SHAPE', steps: WAVES, def: 1 },
    ],
  },
  {
    id: 'sh', title: 'S&H', type: 'sh', group: 'mod',
    jacks: [{ name: 'out', kind: 'out', signal: 'cv' }],
    params: [{ key: 'rate', label: 'RATE', min: 0.1, max: 20, def: 5, curve: 'log', unit: 'hz' }],
  },
  {
    id: 'vcf', title: 'FILTER', type: 'vcf', group: 'audio',
    jacks: [
      { name: 'in', kind: 'in', signal: 'audio' },
      { name: 'fm', kind: 'in', signal: 'cv' },
      { name: 'out', kind: 'out', signal: 'audio' },
    ],
    params: [
      { key: 'cutoff', label: 'CUTOFF', min: 120, max: 16000, def: 12000, curve: 'log', unit: 'hz' },
      { key: 'res', label: 'RES', min: 0.0001, max: 18, def: 3, curve: 'lin' },
      { key: 'fm', label: 'FM', min: -1, max: 1, def: 0.2, curve: 'lin' },
    ],
  },
  {
    id: 'drive', title: 'DRIVE', type: 'drive', group: 'audio',
    jacks: [
      { name: 'in', kind: 'in', signal: 'audio' },
      { name: 'out', kind: 'out', signal: 'audio' },
    ],
    params: [{ key: 'drive', label: 'DRIVE', min: 0, max: 1, def: 0.08, curve: 'lin' }],
  },
  {
    id: 'delay', title: 'DELAY', type: 'delay', group: 'audio',
    jacks: [
      { name: 'in', kind: 'in', signal: 'audio' },
      { name: 'out', kind: 'out', signal: 'audio' },
    ],
    params: [
      { key: 'time', label: 'TIME', min: 0.03, max: 0.9, def: 0.28, curve: 'log', unit: 's' },
      { key: 'feedback', label: 'FEEDBK', min: 0, max: 0.85, def: 0.32, curve: 'lin' },
      { key: 'mix', label: 'MIX', min: 0, max: 1, def: 0, curve: 'lin' },
    ],
  },
  {
    id: 'reverb', title: 'REVERB', type: 'reverb', group: 'audio',
    jacks: [
      { name: 'in', kind: 'in', signal: 'audio' },
      { name: 'out', kind: 'out', signal: 'audio' },
    ],
    params: [{ key: 'mix', label: 'MIX', min: 0, max: 1, def: 0.3, curve: 'lin' }],
  },
  {
    id: 'mix', title: 'MIX', type: 'mix', group: 'util',
    jacks: [
      { name: 'in1', kind: 'in', signal: 'audio' },
      { name: 'in2', kind: 'in', signal: 'audio' },
      { name: 'in3', kind: 'in', signal: 'audio' },
      { name: 'out', kind: 'out', signal: 'audio' },
    ],
    params: [
      { key: 'lvl1', label: 'CH1', min: 0, max: 1, def: 0.7, curve: 'lin' },
      { key: 'lvl2', label: 'CH2', min: 0, max: 1, def: 0.7, curve: 'lin' },
      { key: 'lvl3', label: 'CH3', min: 0, max: 1, def: 0.7, curve: 'lin' },
    ],
  },
  {
    id: 'mult', title: 'MULT', type: 'mult', group: 'util',
    jacks: [
      { name: 'in', kind: 'in', signal: 'audio' },
      { name: 'out1', kind: 'out', signal: 'audio' },
      { name: 'out2', kind: 'out', signal: 'audio' },
      { name: 'out3', kind: 'out', signal: 'audio' },
    ],
    params: [],
  },
  {
    id: 'vca', title: 'VCA', type: 'vca', group: 'audio',
    jacks: [
      { name: 'in', kind: 'in', signal: 'audio' },
      { name: 'cv', kind: 'in', signal: 'cv' },
      { name: 'out', kind: 'out', signal: 'audio' },
    ],
    params: [
      { key: 'level', label: 'LEVEL', min: 0, max: 1.5, def: 1, curve: 'lin' },
      { key: 'cv', label: 'CV AMT', min: -1, max: 1, def: 1, curve: 'lin' },
    ],
  },
  {
    id: 'out', title: 'OUTPUT', type: 'out', group: 'audio',
    jacks: [{ name: 'in', kind: 'in', signal: 'audio' }],
    params: [{ key: 'vol', label: 'VOL', min: 0, max: 1, def: 0.85, curve: 'lin' }],
  },
]

// Core audio chain (shared by every patch); presets add their own modulation.
export const CORE_CHAIN = [
  ['voice.out', 'vcf.in'],
  ['vcf.out', 'drive.in'],
  ['drive.out', 'delay.in'],
  ['delay.out', 'reverb.in'],
  ['reverb.out', 'vca.in'],
  ['vca.out', 'out.in'],
]

// Factory default: core chain + LFO sweeping the filter.
export const DEFAULT_CABLES = [...CORE_CHAIN.map((c) => [...c]), ['lfo.out', 'vcf.fm']]

export function defaultModuleParams() {
  const out = {}
  for (const m of MODULES) {
    out[m.id] = {}
    for (const p of m.params) out[m.id][p.key] = p.def
  }
  return out
}

// CV attenuator ranges: how far full-scale CV (±1) pushes a destination param.
export const CV_RANGE = {
  'vcf.fm': 6000, // Hz of cutoff sweep
  'vca.cv': 1, // gain
}
