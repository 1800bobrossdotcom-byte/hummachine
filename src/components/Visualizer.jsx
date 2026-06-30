import { useEffect, useRef } from 'react'

// Radial waveform: the hum, drawn. A breathing ring whose silhouette is the live
// audio coming out of the analyser. Monochrome, organic — the "machine" half.
export default function Visualizer({ engine, started }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let w = 0
    let h = 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const analyser = engine?.analyser
    const buf = analyser ? new Uint8Array(analyser.fftSize) : null
    let phase = 0

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw)
      ctx.fillStyle = 'rgba(8, 8, 12, 0.18)'
      ctx.fillRect(0, 0, w, h)

      if (!w || !h) return
      const cx = w / 2
      const cy = h / 2
      const baseR = Math.max(1, Math.min(w, h) * 0.22)

      let level = 0
      if (analyser && buf) {
        analyser.getByteTimeDomainData(buf)
      }

      ctx.lineWidth = 1.5
      const rings = 2
      for (let r = 0; r < rings; r++) {
        ctx.beginPath()
        const steps = 180
        for (let i = 0; i <= steps; i++) {
          const a = (i / steps) * Math.PI * 2
          let sample = 0
          if (buf) {
            const idx = Math.floor((i / steps) * buf.length)
            sample = (buf[idx] - 128) / 128
          }
          level += Math.abs(sample)
          const wob = sample * baseR * (0.55 - r * 0.18)
          const rr = baseR * (1 + r * 0.35) + wob + Math.sin(a * 3 + phase + r) * 4
          const x = cx + Math.cos(a) * rr
          const y = cy + Math.sin(a) * rr
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        const alpha = 0.5 - r * 0.18
        ctx.strokeStyle = `rgba(232, 228, 215, ${alpha})`
        ctx.stroke()
      }

      // Soft core that pulses with overall loudness.
      const loud = buf && buf.length ? level / (buf.length * 2) : 0
      const glow = Math.max(1, baseR * (0.35 + loud * 2.5))
      if (Number.isFinite(glow) && Number.isFinite(cx) && Number.isFinite(cy)) {
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glow)
        grad.addColorStop(0, `rgba(232, 228, 215, ${0.12 + loud * 0.5})`)
        grad.addColorStop(1, 'rgba(232, 228, 215, 0)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(cx, cy, glow, 0, Math.PI * 2)
        ctx.fill()
      }

      phase += 0.01
    }
    draw()

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [engine, started])

  return <canvas ref={canvasRef} className="viz" />
}
