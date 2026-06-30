import { useCallback, useEffect, useRef, useState } from 'react'
import { Engine } from './audio/engine.js'
import Visualizer from './components/Visualizer.jsx'
import Keys from './components/Keys.jsx'
import Panel from './components/Panel.jsx'
import { defaultParams, patchParams } from './audio/params.js'
import { listPatches, savePatch } from './audio/patches.js'
import { midiToName } from './audio/theory.js'

export default function App() {
  const engineRef = useRef(null)
  const [started, setStarted] = useState(false)
  const [tookOver, setTookOver] = useState(false)
  const [midiStatus, setMidiStatus] = useState('idle')
  const [active, setActive] = useState(() => new Set())
  const [params, setParams] = useState(defaultParams)
  const [patches, setPatches] = useState(() => listPatches())
  const [patchIndex, setPatchIndex] = useState(0)
  const [note, setNote] = useState('')

  const begin = useCallback(async () => {
    if (engineRef.current) return
    const engine = new Engine()
    engineRef.current = engine
    engine.on((e) => {
      if (e.type === 'takeover') setTookOver(true)
      else if (e.type === 'midi') setMidiStatus(e.status)
      else if (e.type === 'noteon') {
        setActive(new Set(engine.activeNotes))
        setNote(midiToName(e.midi))
      } else if (e.type === 'noteoff') {
        setActive(new Set(engine.activeNotes))
      }
    })
    try {
      await engine.start(params)
      setStarted(true)
    } catch (err) {
      console.error('hummachine: failed to start', err)
    }
  }, [params])

  useEffect(() => {
    return () => engineRef.current && engineRef.current.dispose()
  }, [])

  const onParam = useCallback((key, value) => {
    setParams((prev) => ({ ...prev, [key]: value }))
    if (engineRef.current) engineRef.current.setParam(key, value)
  }, [])

  const loadPatch = useCallback((index) => {
    const list = listPatches()
    const wrapped = ((index % list.length) + list.length) % list.length
    const next = patchParams(list[wrapped])
    setParams(next)
    setPatchIndex(wrapped)
    if (engineRef.current) engineRef.current.applyParams(next)
  }, [])

  const onSave = useCallback(() => {
    let name = 'PATCH'
    try {
      name = window.prompt('Name this patch', 'MY HUM') || name
    } catch { /* iframe blocked prompt */ }
    savePatch(name, params)
    const list = listPatches()
    setPatches(list)
    const idx = list.findIndex((p) => !p.factory && p.name.toUpperCase() === name.trim().toUpperCase())
    if (idx >= 0) setPatchIndex(idx)
  }, [params])

  const current = patches[patchIndex] || patches[0]

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
          <p className="hint">{tookOver ? 'you have it — play' : 'listening… play to take over'}</p>

          <Panel
            engine={engineRef.current}
            started={started}
            params={params}
            onParam={onParam}
            patch={{
              name: current?.name,
              index: patchIndex,
              total: patches.length,
              isFactory: !!current?.factory,
              note,
              onPrev: () => loadPatch(patchIndex - 1),
              onNext: () => loadPatch(patchIndex + 1),
              onSave,
            }}
          />

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
