// Computer-keyboard input, Ableton-style. Two chromatic rows so a laptop becomes
// a two-octave hum-piano. Z/X shift the octave.

// Lower row starts at the base octave; upper row an octave above.
const LOWER = ['z', 's', 'x', 'd', 'c', 'v', 'g', 'b', 'h', 'n', 'j', 'm', ',', 'l', '.', ';', '/']
const UPPER = ['q', '2', 'w', '3', 'e', 'r', '5', 't', '6', 'y', '7', 'u', 'i', '9', 'o', '0', 'p']

export function initKeyboard({ onNoteOn, onNoteOff, baseMidi = 48 } = {}) {
  let base = baseMidi
  const down = new Set()

  const midiFor = (key) => {
    const lo = LOWER.indexOf(key)
    if (lo !== -1) return base + lo
    const hi = UPPER.indexOf(key)
    if (hi !== -1) return base + 12 + hi
    return null
  }

  const onKeyDown = (e) => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return
    const key = e.key.toLowerCase()
    if (key === 'arrowleft') { base = Math.max(12, base - 12); return }
    if (key === 'arrowright') { base = Math.min(96, base + 12); return }
    const midi = midiFor(key)
    if (midi == null || down.has(key)) return
    down.add(key)
    e.preventDefault()
    onNoteOn && onNoteOn(midi, 0.85)
  }

  const onKeyUp = (e) => {
    const key = e.key.toLowerCase()
    const midi = midiFor(key)
    if (midi == null) return
    down.delete(key)
    onNoteOff && onNoteOff(midi)
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)

  return () => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
  }
}
