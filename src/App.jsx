import { useCallback, useEffect, useRef, useState } from 'react'
import { Engine } from './audio/engine.js'
import Visualizer from './components/Visualizer.jsx'
import Keys from './components/Keys.jsx'

export default function App() {
  const engineRef = useRef(null)
  const [started, setStarted] = useState(false)
  const [tookOver, setTookOver] = useState(false)
  const [midiStatus, setMidiStatus] = useState('idle')
  const [active, setActive] = useState(() => new Set())

  // Browsers gate audio behind a gesture — the overlay IS that gesture.
  const begin = useCallback(async () => {
    if (engineRef.current) return
    const engine = new Engine()
    engineRef.current = engine
    engine.on((e) => {
      if (e.type === 'takeover') setTookOver(true)
      else if (e.type === 'midi') setMidiStatus(e.status)
      else if (e.type === 'noteon' || e.type === 'noteoff') {
        setActive(new Set(engine.activeNotes))
      }
    })
    try {
      await engine.start()
      setStarted(true)
    } catch (err) {
      console.error('hummachine: failed to start', err)
    }
  }, [])

  useEffect(() => {
    return () => engineRef.current && engineRef.current.dispose()
  }, [])

  return (
    <div className="app">
      <Visualizer engine={engineRef.current} started={started} />

      <header className="hud-top">
        <h1>hummachine</h1>
        <p className="tag">human · machine</p>
      </header>

      {!started && (
        <button className="gate" onClick={begin}>
          <span className="gate-ring" />
          <span className="gate-label">touch to wake</span>
        </button>
      )}

      {started && (
        <footer className="hud-bottom">
          <p className="hint">
            {tookOver ? 'you have it — play' : 'listening… play to take over'}
          </p>
          <Keys engine={engineRef.current} activeNotes={active} base={48} octaves={2} />
          <div className="meta">
            <span>keyboard · mouse · touch</span>
            <span className={`midi midi-${midiStatus}`}>
              midi: {midiStatus === 'connected' ? 'live' : midiStatus}
            </span>
          </div>
        </footer>
      )}
    </div>
  )
}
