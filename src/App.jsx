import { useCallback, useEffect, useRef, useState } from 'react'
import { Engine } from './audio/engine.js'
import Keys from './components/Keys.jsx'
import Rack from './components/Rack.jsx'
import LedDisplay from './components/LedDisplay.jsx'
import { defaultModuleParams, DEFAULT_CABLES } from './audio/modules.js'
import { listPatches, savePatch, patchState } from './audio/patches.js'
import { midiToName } from './audio/theory.js'

export default function App() {
  const engineRef = useRef(null)
  const [started, setStarted] = useState(false)
  const [tookOver, setTookOver] = useState(false)
  const [midiStatus, setMidiStatus] = useState('idle')
  const [active, setActive] = useState(() => new Set())
  const [note, setNote] = useState('')

  const [modParams, setModParams] = useState(defaultModuleParams)
  const [cables, setCables] = useState(() => DEFAULT_CABLES.map((c) => [...c]))
  const [patches, setPatches] = useState(() => listPatches())
  const [patchIndex, setPatchIndex] = useState(0)

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
      await engine.start({ params: modParams, cables })
      setStarted(true)
    } catch (err) {
      console.error('hummachine: failed to start', err)
    }
  }, [modParams, cables])

  useEffect(() => () => engineRef.current && engineRef.current.dispose(), [])

  const onParam = useCallback((modId, key, value) => {
    setModParams((prev) => ({ ...prev, [modId]: { ...prev[modId], [key]: value } }))
    if (engineRef.current) engineRef.current.setParam(modId, key, value)
  }, [])

  const onAddCable = useCallback((from, to) => {
    if (engineRef.current && !engineRef.current.addCable(from, to)) return
    setCables((prev) => (prev.some((c) => c[0] === from && c[1] === to) ? prev : [...prev, [from, to]]))
  }, [])

  const onRemoveCable = useCallback((from, to) => {
    if (engineRef.current) engineRef.current.removeCable(from, to)
    setCables((prev) => prev.filter((c) => !(c[0] === from && c[1] === to)))
  }, [])

  const loadPatch = useCallback((index) => {
    const list = listPatches()
    const wrapped = ((index % list.length) + list.length) % list.length
    const st = patchState(list[wrapped])
    setModParams(st.params)
    setCables(st.cables)
    setPatchIndex(wrapped)
    if (engineRef.current) engineRef.current.applyState(st)
  }, [])

  const onSave = useCallback(() => {
    let name = 'MY HUM'
    try {
      name = window.prompt('Name this patch', 'MY HUM') || name
    } catch { /* iframe blocked prompt */ }
    savePatch(name, { params: modParams, cables })
    const list = listPatches()
    setPatches(list)
    const idx = list.findIndex((p) => !p.factory && p.name.toUpperCase() === name.trim().toUpperCase())
    if (idx >= 0) setPatchIndex(idx)
  }, [modParams, cables])

  const current = patches[patchIndex] || patches[0]

  return (
    <div className="app">
      <header className="hud-top">
        <h1>hummachine</h1>
        <p className="tag">human · machine · modular</p>
      </header>

      {!started && (
        <button className="gate" onClick={begin}>
          <span className="gate-ring" />
          <span className="gate-label">touch to wake</span>
        </button>
      )}

      {started && (
        <div className="stage">
          <div className="stage-top">
            <LedDisplay
              engine={engineRef.current}
              started={started}
              patchName={current?.name}
              patchIndex={patchIndex}
              patchTotal={patches.length}
              isFactory={!!current?.factory}
              note={note}
              onPrev={() => loadPatch(patchIndex - 1)}
              onNext={() => loadPatch(patchIndex + 1)}
              onSave={onSave}
            />
            <p className="hint">
              {tookOver ? 'you have it — play · drag cables to repatch' : 'listening… play to take over'}
            </p>
          </div>

          <Rack
            engine={engineRef.current}
            modParams={modParams}
            onParam={onParam}
            cables={cables}
            onAddCable={onAddCable}
            onRemoveCable={onRemoveCable}
          />

          <footer className="hud-bottom">
            <Keys engine={engineRef.current} activeNotes={active} base={48} octaves={2} />
            <div className="meta">
              <span>keyboard · mouse · touch · drag-to-patch</span>
              <span className={`midi midi-${midiStatus}`}>
                midi: {midiStatus === 'connected' ? 'live' : midiStatus}
              </span>
            </div>
          </footer>
        </div>
      )}
    </div>
  )
}
