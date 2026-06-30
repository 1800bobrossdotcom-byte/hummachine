// Small music-theory helpers. Scientific pitch: A4 = MIDI 69 = 440 Hz, C4 = 60.

const NOTE_INDEX = {
  C: 0, 'C#': 1, DB: 1, D: 2, 'D#': 3, EB: 3, E: 4, F: 5,
  'F#': 6, GB: 6, G: 7, 'G#': 8, AB: 8, A: 9, 'A#': 10, BB: 10, B: 11,
}

export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export function midiToName(midi) {
  const n = NOTE_NAMES[((midi % 12) + 12) % 12]
  const oct = Math.floor(midi / 12) - 1
  return `${n}${oct}`
}

// Parse "C3", "F#4", "Db2" (and the # written as 's', e.g. "Cs3") into a MIDI number.
export function nameToMidi(raw) {
  if (raw == null) return null
  const m = String(raw).trim().match(/^([A-Ga-g])([#sb]?)(-?\d+)$/)
  if (!m) return null
  let letter = m[1].toUpperCase()
  const accidental = m[2] === 's' ? '#' : m[2].toUpperCase()
  const octave = parseInt(m[3], 10)
  const key = (letter + accidental).toUpperCase()
  const idx = NOTE_INDEX[key]
  if (idx == null) return null
  return (octave + 1) * 12 + idx
}

// Scale intervals (semitones from root). Used by the generative auto-player.
export const SCALES = {
  pentatonicMinor: [0, 3, 5, 7, 10],
  pentatonicMajor: [0, 2, 4, 7, 9],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
}

// Build a list of MIDI notes for a scale across an octave span.
export function scaleNotes(rootMidi, scale, octaves = 3) {
  const out = []
  for (let o = 0; o < octaves; o++) {
    for (const step of scale) out.push(rootMidi + o * 12 + step)
  }
  return out
}
