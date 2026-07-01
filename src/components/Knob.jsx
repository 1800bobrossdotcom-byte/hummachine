import { useCallback, useRef } from 'react'

// Rotary knob. Drag up/down (or scroll) to turn; double-click resets to default.
// Maps linear/log ranges to a 270° sweep with an SVG indicator + value arc.

const ARC = 270 // degrees of travel
const START = -135 // degrees (pointing down-left)

// Normalize a spec so stepped (enumerated) knobs share the rotary math.
function range(spec) {
  if (spec.steps) return { min: 0, max: spec.steps.length - 1, curve: 'lin', stepped: true }
  return { min: spec.min, max: spec.max, curve: spec.curve, stepped: false }
}

function toNorm(rawSpec, value) {
  const { min, max, curve } = range(rawSpec)
  if (curve === 'log') {
    const lo = Math.log(Math.max(min, 1e-6))
    const hi = Math.log(max)
    return (Math.log(Math.max(value, 1e-6)) - lo) / (hi - lo)
  }
  return (value - min) / (max - min)
}

function fromNorm(rawSpec, norm) {
  const { min, max, curve, stepped } = range(rawSpec)
  const n = Math.min(1, Math.max(0, norm))
  if (curve === 'log') {
    const lo = Math.log(Math.max(min, 1e-6))
    const hi = Math.log(max)
    return Math.exp(lo + (hi - lo) * n)
  }
  const v = min + (max - min) * n
  return stepped ? Math.round(v) : v
}

function format(spec, value) {
  if (spec.steps) return spec.steps[Math.round(value)] ?? '—'
  const { unit, max } = spec
  if (unit === 'hz') return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : `${Math.round(value)}`
  if (unit === 's') return value < 1 ? `${Math.round(value * 1000)}ms` : `${value.toFixed(2)}s`
  if (max <= 1) return `${Math.round(value * 100)}`
  return value.toFixed(1)
}

export default function Knob({ spec, value, onChange }) {
  const norm = toNorm(spec, value)
  const dragRef = useRef(null)

  const onPointerDown = useCallback(
    (e) => {
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      dragRef.current = { y: e.clientY, norm: toNorm(spec, value) }
    },
    [spec, value],
  )

  const onPointerMove = useCallback(
    (e) => {
      if (!dragRef.current) return
      const dy = dragRef.current.y - e.clientY
      const fine = e.shiftKey ? 0.25 : 1
      const next = dragRef.current.norm + (dy / 180) * fine
      onChange(fromNorm(spec, next))
    },
    [spec, onChange],
  )

  const onPointerUp = useCallback((e) => {
    dragRef.current = null
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* noop */ }
  }, [])

  const onWheel = useCallback(
    (e) => {
      e.preventDefault()
      const step = (e.deltaY < 0 ? 1 : -1) * 0.04
      onChange(fromNorm(spec, toNorm(spec, value) + step))
    },
    [spec, value, onChange],
  )

  const angle = START + ARC * norm
  const r = 17
  const cx = 22
  const cy = 22
  // Value arc as an SVG path.
  const a0 = ((START - 90) * Math.PI) / 180
  const a1 = ((angle - 90) * Math.PI) / 180
  const large = ARC * norm > 180 ? 1 : 0
  const x0 = cx + r * Math.cos(a0)
  const y0 = cy + r * Math.sin(a0)
  const x1 = cx + r * Math.cos(a1)
  const y1 = cy + r * Math.sin(a1)

  return (
    <div className="knob" title={`${spec.label} — drag to adjust, double-click to reset`}>
      <svg
        width="44"
        height="44"
        viewBox="0 0 44 44"
        className="knob-dial"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={() => onChange(spec.def)}
        onWheel={onWheel}
      >
        <circle cx={cx} cy={cy} r={r} className="knob-track" />
        {norm > 0.001 && (
          <path d={`M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`} className="knob-arc" />
        )}
        <circle cx={cx} cy={cy} r="13" className="knob-cap" />
        <line
          x1={cx}
          y1={cy}
          x2={cx + 12 * Math.cos((angle - 90) * Math.PI / 180)}
          y2={cy + 12 * Math.sin((angle - 90) * Math.PI / 180)}
          className="knob-pointer"
        />
      </svg>
      <span className="knob-label">{spec.label}</span>
      <span className="knob-value">{format(spec, value)}</span>
    </div>
  )
}
