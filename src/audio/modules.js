// Static description of the modular rack. Both the audio graph (modular.js) and
// the UI (Rack/Module components) are driven from these specs, so a module only
// needs to be described once.
//
// Each module: { id, title, type, jacks[], params[] }
//   jack:  { name, kind: 'in'|'out', signal: 'audio'|'cv' }
//   param: { key, label, min, max, def, curve, unit }  (rendered as a Knob)
//
// A jack's global id is `${moduleId}.${jackName}` (e.g. "vcf.in").

export const MODULES = [
  {
    id: 'voice',
    title: 'VOICES',
    type: 'voice',
    jacks: [{ name: 'out', kind: 'out', signal: 'audio' }],
    params: [{ key: 'level', label: 'LEVEL', min: 0, max: 1.5, def: 1, curve: 'lin' }],
  },
  {
    id: 'lfo',
    title: 'LFO',
    type: 'lfo',
    jacks: [{ name: 'out', kind: 'out', signal: 'cv' }],
    params: [{ key: 'rate', label: 'RATE', min: 0.02, max: 12, def: 4, curve: 'log', unit: 'hz' }],
  },
  {
    id: 'vcf',
    title: 'FILTER',
    type: 'vcf',
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
    id: 'drive',
    title: 'DRIVE',
    type: 'drive',
    jacks: [
      { name: 'in', kind: 'in', signal: 'audio' },
      { name: 'out', kind: 'out', signal: 'audio' },
    ],
    params: [{ key: 'drive', label: 'DRIVE', min: 0, max: 1, def: 0.08, curve: 'lin' }],
  },
  {
    id: 'delay',
    title: 'DELAY',
    type: 'delay',
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
    id: 'reverb',
    title: 'REVERB',
    type: 'reverb',
    jacks: [
      { name: 'in', kind: 'in', signal: 'audio' },
      { name: 'out', kind: 'out', signal: 'audio' },
    ],
    params: [{ key: 'mix', label: 'MIX', min: 0, max: 1, def: 0.3, curve: 'lin' }],
  },
  {
    id: 'vca',
    title: 'VCA',
    type: 'vca',
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
    id: 'out',
    title: 'OUTPUT',
    type: 'out',
    jacks: [{ name: 'in', kind: 'in', signal: 'audio' }],
    params: [{ key: 'vol', label: 'VOL', min: 0, max: 1, def: 0.85, curve: 'lin' }],
  },
]

// The factory patch cabling: VOICES -> FILTER -> DRIVE -> DELAY -> REVERB -> VCA
// -> OUTPUT, with the LFO sweeping the filter. Each cable is [outJack, inJack].
export const DEFAULT_CABLES = [
  ['voice.out', 'vcf.in'],
  ['vcf.out', 'drive.in'],
  ['drive.out', 'delay.in'],
  ['delay.out', 'reverb.in'],
  ['reverb.out', 'vca.in'],
  ['vca.out', 'out.in'],
  ['lfo.out', 'vcf.fm'],
]

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
