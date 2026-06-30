// Every tweakable knob on the hummachine faceplate. The engine reads these by
// `key`; the UI renders one <Knob> per entry. `curve: 'log'` knobs feel natural
// across wide ranges (frequency, time).

export const PARAMS = [
  { key: 'volume', label: 'VOL', min: 0, max: 1, def: 0.85, curve: 'lin' },
  { key: 'cutoff', label: 'CUTOFF', min: 120, max: 16000, def: 16000, curve: 'log', unit: 'hz' },
  { key: 'resonance', label: 'RES', min: 0.0001, max: 18, def: 0.8, curve: 'lin' },
  { key: 'attack', label: 'ATTACK', min: 0.005, max: 2, def: 0.02, curve: 'log', unit: 's' },
  { key: 'release', label: 'RELEASE', min: 0.05, max: 3.5, def: 0.45, curve: 'log', unit: 's' },
  { key: 'drive', label: 'DRIVE', min: 0, max: 1, def: 0.06, curve: 'lin' },
  { key: 'reverb', label: 'REVERB', min: 0, max: 1, def: 0.28, curve: 'lin' },
  { key: 'delay', label: 'DELAY', min: 0, max: 1, def: 0, curve: 'lin' },
  { key: 'delayTime', label: 'TIME', min: 0.05, max: 0.8, def: 0.3, curve: 'log', unit: 's' },
  { key: 'feedback', label: 'FEEDBK', min: 0, max: 0.85, def: 0.3, curve: 'lin' },
  { key: 'vibRate', label: 'VIB HZ', min: 0, max: 9, def: 5, curve: 'lin' },
  { key: 'vibDepth', label: 'VIB', min: 0, max: 60, def: 6, curve: 'lin', unit: 'ct' },
]

export function defaultParams() {
  const out = {}
  for (const p of PARAMS) out[p.key] = p.def
  return out
}

// Factory patches: partial overrides merged onto the defaults.
export const FACTORY_PATCHES = [
  { name: 'INIT', factory: true, params: {} },
  { name: 'CATHEDRAL', factory: true, params: { cutoff: 9000, reverb: 0.7, release: 2.4, attack: 0.4 } },
  { name: 'VOX DUST', factory: true, params: { drive: 0.45, vibDepth: 22, vibRate: 5.6, cutoff: 5200, reverb: 0.35 } },
  { name: 'TAPE ECHO', factory: true, params: { delay: 0.5, delayTime: 0.36, feedback: 0.55, reverb: 0.2, cutoff: 7000 } },
  { name: 'GLASS PAD', factory: true, params: { cutoff: 14000, resonance: 6, attack: 0.6, release: 2.8, reverb: 0.5 } },
  { name: 'SUB HUM', factory: true, params: { cutoff: 1400, resonance: 3, drive: 0.2, release: 1.2 } },
]

export function patchParams(patch) {
  return { ...defaultParams(), ...(patch.params || {}) }
}
