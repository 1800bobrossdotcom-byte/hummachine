import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import Module from './Module.jsx'
import { MODULES } from '../audio/modules.js'

// Jack metadata lookup (kind + signal) built once from the specs.
const JACK_META = new Map()
for (const m of MODULES) {
  for (const j of m.jacks) JACK_META.set(`${m.id}.${j.name}`, { kind: j.kind, signal: j.signal })
}

const CABLE_COLORS = ['#e8734d', '#5db0e8', '#8ce88c', '#e8c85d', '#c98ce8', '#e85d9a', '#5de8c9']

function isValidPair(aId, bId) {
  if (aId === bId) return null
  const a = JACK_META.get(aId)
  const b = JACK_META.get(bId)
  if (!a || !b) return null
  if (a.signal !== b.signal) return null
  if (a.kind === b.kind) return null
  // Return [outJack, inJack].
  return a.kind === 'out' ? [aId, bId] : [bId, aId]
}

export default function Rack({ engine, modParams, onParam, cables, onAddCable, onRemoveCable }) {
  const rackRef = useRef(null)
  const [positions, setPositions] = useState({})
  const [drag, setDrag] = useState(null) // { anchor, signal, x, y }

  // Measure every jack center relative to the (content-sized) rack element.
  const measure = useCallback(() => {
    const rack = rackRef.current
    if (!rack) return
    const base = rack.getBoundingClientRect()
    const next = {}
    rack.querySelectorAll('[data-jack]').forEach((el) => {
      const port = el.querySelector('.jack-port') || el
      const r = port.getBoundingClientRect()
      next[el.dataset.jack] = { x: r.left + r.width / 2 - base.left, y: r.top + r.height / 2 - base.top }
    })
    setPositions(next)
  }, [])

  useLayoutEffect(() => {
    measure()
  }, [measure, cables, modParams])

  useEffect(() => {
    const ro = new ResizeObserver(measure)
    if (rackRef.current) ro.observe(rackRef.current)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [measure])

  const pointFromEvent = useCallback((e) => {
    const base = rackRef.current.getBoundingClientRect()
    return { x: e.clientX - base.left, y: e.clientY - base.top }
  }, [])

  const startDrag = useCallback(
    (e) => {
      const jackEl = e.target.closest('[data-jack]')
      if (!jackEl) return
      e.preventDefault()
      const id = jackEl.dataset.jack
      const meta = JACK_META.get(id)
      // Repatch: grabbing a patched INPUT lifts its existing cable off.
      if (meta.kind === 'in') {
        const existing = cables.find((c) => c[1] === id)
        if (existing) {
          onRemoveCable(existing[0], existing[1])
          const p = pointFromEvent(e)
          setDrag({ anchor: existing[0], signal: meta.signal, x: p.x, y: p.y })
          return
        }
      }
      const p = pointFromEvent(e)
      setDrag({ anchor: id, signal: meta.signal, x: p.x, y: p.y })
    },
    [cables, onRemoveCable, pointFromEvent],
  )

  useEffect(() => {
    if (!drag) return
    const move = (e) => {
      const p = pointFromEvent(e)
      setDrag((d) => (d ? { ...d, x: p.x, y: p.y } : d))
    }
    const up = (e) => {
      const target = document.elementFromPoint(e.clientX, e.clientY)
      const jackEl = target && target.closest('[data-jack]')
      if (jackEl) {
        const pair = isValidPair(drag.anchor, jackEl.dataset.jack)
        if (pair) onAddCable(pair[0], pair[1])
      }
      setDrag(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [drag, onAddCable, pointFromEvent])

  const cablePath = (a, b) => {
    if (!a || !b) return ''
    const dx = Math.abs(b.x - a.x)
    const sag = Math.min(120, 26 + dx * 0.25 + Math.abs(b.y - a.y) * 0.15)
    const c1y = a.y + sag
    const c2y = b.y + sag
    return `M ${a.x} ${a.y} C ${a.x} ${c1y}, ${b.x} ${c2y}, ${b.x} ${b.y}`
  }

  return (
    <div className="rack-scroll">
      <div className="rack" ref={rackRef} onPointerDown={startDrag}>
        {MODULES.map((spec) => (
          <Module
            key={spec.id}
            spec={spec}
            params={modParams[spec.id]}
            onParam={(key, val) => onParam(spec.id, key, val)}
            engine={engine}
          />
        ))}

        <svg className="cables" aria-hidden="true">
          {cables.map(([from, to], i) => (
            <path
              key={`${from}|${to}`}
              d={cablePath(positions[from], positions[to])}
              stroke={CABLE_COLORS[i % CABLE_COLORS.length]}
              className="cable"
            />
          ))}
          {drag && (
            <path
              d={cablePath(positions[drag.anchor], { x: drag.x, y: drag.y })}
              stroke="#f5b85c"
              className="cable cable-drag"
            />
          )}
        </svg>
      </div>
    </div>
  )
}
