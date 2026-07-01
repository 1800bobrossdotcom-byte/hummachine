import { useEffect, useRef } from 'react'

// A small oscilloscope: the output waveform as a horizontal trace. Replaces the
// old radial "eye" — this reads like a piece of test gear on the OUTPUT module.
export default function Scope({ engine }) {
  const ref = useRef(null)
  const raf = useRef(0)

  useEffect(() => {
    const canvas = ref.current
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
    const buf = analyser ? new Uint8Array(analyser.fftSize) : null

    const draw = () => {
      raf.current = requestAnimationFrame(draw)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (!w || !h) return
      ctx.clearRect(0, 0, w, h)
      if (!analyser || !buf) return
      analyser.getByteTimeDomainData(buf)

      ctx.beginPath()
      const step = buf.length / w
      for (let x = 0; x < w; x++) {
        const v = (buf[Math.floor(x * step)] - 128) / 128
        const y = h / 2 + v * (h / 2) * 0.9
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.strokeStyle = 'rgba(245, 184, 92, 0.85)'
      ctx.lineWidth = 1.25
      ctx.shadowColor = 'rgba(245, 184, 92, 0.6)'
      ctx.shadowBlur = 4
      ctx.stroke()
      ctx.shadowBlur = 0
    }
    draw()
    return () => {
      cancelAnimationFrame(raf.current)
      window.removeEventListener('resize', resize)
    }
  }, [engine])

  return <canvas ref={ref} className="scope" />
}
