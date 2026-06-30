import { useMemo } from 'react'
import { NOTE_NAMES } from '../audio/theory.js'

// On-screen, touch-friendly keyboard. Two octaves from a base note. Pointer
// events so it works with mouse and multitouch.
const WHITE = [0, 2, 4, 5, 7, 9, 11]
const BLACK = { 1: 0, 3: 1, 6: 3, 8: 4, 10: 5 } // semitone -> which white-gap

export default function Keys({ engine, activeNotes, base = 48, octaves = 2 }) {
  const whites = useMemo(() => {
    const out = []
    for (let o = 0; o < octaves; o++) {
      for (const s of WHITE) out.push(base + o * 12 + s)
    }
    return out
  }, [base, octaves])

  const blacks = useMemo(() => {
    const out = []
    for (let o = 0; o < octaves; o++) {
      for (const semi of Object.keys(BLACK)) {
        out.push({ midi: base + o * 12 + Number(semi), gap: o * 7 + BLACK[semi] })
      }
    }
    return out
  }, [base, octaves])

  const press = (midi) => (e) => {
    e.preventDefault()
    engine.noteOn(midi, 0.85)
  }
  const release = (midi) => (e) => {
    e.preventDefault()
    engine.noteOff(midi)
  }

  const whiteW = 100 / whites.length

  return (
    <div className="keys" role="group" aria-label="keyboard">
      {whites.map((midi) => (
        <button
          key={midi}
          className={`key white ${activeNotes.has(midi) ? 'on' : ''}`}
          style={{ width: `${whiteW}%` }}
          onPointerDown={press(midi)}
          onPointerUp={release(midi)}
          onPointerLeave={release(midi)}
          onPointerCancel={release(midi)}
        >
          <span>{NOTE_NAMES[midi % 12]}</span>
        </button>
      ))}
      {blacks.map(({ midi, gap }) => (
        <button
          key={midi}
          className={`key black ${activeNotes.has(midi) ? 'on' : ''}`}
          style={{ left: `calc(${(gap + 1) * whiteW}% - ${whiteW * 0.3}%)`, width: `${whiteW * 0.6}%` }}
          onPointerDown={press(midi)}
          onPointerUp={release(midi)}
          onPointerLeave={release(midi)}
          onPointerCancel={release(midi)}
        />
      ))}
    </div>
  )
}
