import { useEffect, useRef } from 'react'

// Backlit LED "browser" screen: a vintage-synth LCD that shows the live spectrum
// of the sound, the current patch (with prev/next browse), the last note played,
// and a save control. Amber-on-black with a glow + scanline overlay.

export default function LedDisplay({
  engine,
  started,
  patchName,
  patchIndex,
  patchTotal,
  isFactory,
  note,
  onPrev,
  onNext,
  onSave,
}) {
  const canvasRef = useRef(null)
  const rafRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      canvas.width = canvas.clientWidth * dpr
      canvas.height = canvas.clientHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const analyser = engine?.analyser
    const buf = analyser ? new Uint8Array(analyser.frequencyBinCount) : null

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (!w || !h) return
      ctx.clearRect(0, 0, w, h)
      if (!analyser || !buf) return
      analyser.getByteFrequencyData(buf)

      const bars = 40
      const gap = 2
      const bw = (w - gap * (bars - 1)) / bars
      // Sample the lower ~half of the spectrum where the hum energy lives.
      for (let i = 0; i < bars; i++) {
        const idx = Math.floor(Math.pow(i / bars, 1.6) * (buf.length * 0.55))
        const v = buf[idx] / 255
        const bh = Math.max(1.5, v * h * 0.92)
        const x = i * (bw + gap)
        const y = h - bh
        ctx.fillStyle = `rgba(245, 184, 92, ${0.25 + v * 0.75})`
        ctx.fillRect(x, y, bw, bh)
        ctx.fillStyle = 'rgba(245, 184, 92, 0.9)'
        ctx.fillRect(x, y, bw, 1.5) // bright cap
      }
    }
    draw()
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [engine, started])

  return (
    <div className="led">
      <div className="led-screen">
        <div className="led-row led-top">
          <span className="led-tag">PATCH</span>
          <span className="led-num">
            {String(patchIndex + 1).padStart(2, '0')}/{String(patchTotal).padStart(2, '0')}
          </span>
        </div>
        <div className="led-name">{patchName || '—'}</div>
        <canvas ref={canvasRef} className="led-canvas" />
        <div className="led-row led-bottom">
          <span className="led-note">{note ? `NOTE ${note}` : 'READY'}</span>
          <span className="led-kind">{isFactory ? 'FACTORY' : 'USER'}</span>
        </div>
        <div className="led-scan" />
      </div>
      <div className="led-controls">
        <button className="led-btn" onClick={onPrev} aria-label="previous patch">◀</button>
        <button className="led-btn save" onClick={onSave}>SAVE</button>
        <button className="led-btn" onClick={onNext} aria-label="next patch">▶</button>
      </div>
    </div>
  )
}
