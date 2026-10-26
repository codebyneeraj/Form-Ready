import { useEffect, useRef, useState } from 'react'
import { applyMask, manualBox, type Box } from '../privacy/mask'
import { findIdDigits } from '../privacy/ocr'
import { applyWatermark } from '../privacy/watermark'
import { Back, Icon } from './icons'

type Pt = { x: number; y: number }

export function Privacy({ idBlob, examName, onDone, onBack }: { idBlob: Blob; examName: string; onDone: (b: Blob, masked: boolean) => void; onBack: () => void }) {
  const base = useRef<HTMLCanvasElement>(null!)
  const view = useRef<HTMLCanvasElement>(null)
  const [src, setSrc] = useState('')
  const [on, setOn] = useState(true)
  const [boxes, setBoxes] = useState<Box[]>([])
  const [ready, setReady] = useState(false)
  const [adjust, setAdjust] = useState(false)
  const [drag, setDrag] = useState<{ a: Pt; b: Pt } | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    const url = URL.createObjectURL(idBlob)
    setSrc(url)
    ;(async () => {
      const bmp = await createImageBitmap(idBlob)
      const c = document.createElement('canvas')
      c.width = bmp.width; c.height = bmp.height
      c.getContext('2d')!.drawImage(bmp, 0, 0)
      base.current = c
      setReady(true)
      try { setBoxes(await findIdDigits(c)) } catch { setErr('Could not find the digits automatically. Drag over them to hide them.'); setAdjust(true) }
    })()
    return () => URL.revokeObjectURL(url)
  }, [idBlob])

  const render = (c: HTMLCanvasElement) => {
    c.width = base.current.width; c.height = base.current.height
    c.getContext('2d')!.drawImage(base.current, 0, 0)
    if (on) { applyMask(c, boxes); applyWatermark(c, examName, new Date().toLocaleDateString('en-GB')) }
  }
  useEffect(() => { if (ready && view.current) render(view.current) })

  const pt = (e: React.PointerEvent): Pt => {
    const r = view.current!.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * view.current!.width, y: ((e.clientY - r.top) / r.height) * view.current!.height }
  }
  const pct = (p: Pt) => ({ x: (p.x / view.current!.width) * 100, y: (p.y / view.current!.height) * 100 })

  const confirm = () => {
    const c = document.createElement('canvas')
    render(c)
    c.toBlob((b) => b && onDone(b, on), 'image/jpeg', 0.92)
  }

  return (
    <div className="screen">
      <Back onClick={onBack} label="Back to checks" title="Protect your ID" />
      <div className="toggle-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon n="shieldok" size={24} color="#C93A00" />
          <div className="stack" style={{ gap: 2 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>Privacy mode</div>
            <div className="small muted">Hide digits, mark for one use</div>
          </div>
        </div>
        <button role="switch" aria-checked={on} aria-label="Privacy mode" className={'switch ' + (on ? 'on' : '')} onClick={() => setOn(!on)}><i /></button>
      </div>
      <div className="stack" style={{ gap: 8 }}>
        <div className="label">Before / after</div>
        <div className="ba">
          <img src={src} alt="Your ID before" />
          <div style={{ position: 'relative' }}>
            {ready ? <canvas ref={view} aria-label="Your ID after" style={{ touchAction: adjust ? 'none' : 'auto', cursor: adjust ? 'crosshair' : 'default' }}
              onPointerDown={(e) => { if (adjust) { e.currentTarget.setPointerCapture(e.pointerId); const p = pt(e); setDrag({ a: p, b: p }) } }}
              onPointerMove={(e) => drag && setDrag({ ...drag, b: pt(e) })}
              onPointerUp={() => { if (drag && Math.abs(drag.a.x - drag.b.x) > 4 && Math.abs(drag.a.y - drag.b.y) > 4) setBoxes([...boxes, manualBox(drag.a, drag.b)]); setDrag(null) }} /> : <p className="small muted">Reading your ID…</p>}
            {drag && (() => { const a = pct(drag.a), b = pct(drag.b); return <div className="drag" style={{ left: Math.min(a.x, b.x) + '%', top: Math.min(a.y, b.y) + '%', width: Math.abs(a.x - b.x) + '%', height: Math.abs(a.y - b.y) + '%' }} /> })()}
          </div>
        </div>
      </div>
      <div className="stack" style={{ gap: 10, fontSize: 14, fontWeight: 600 }}>
        {boxes.length
          ? <div className="tick"><Icon n="ok" size={22} color="#138808" />First 8 digits hidden, last 4 kept</div>
          : <div className="tick"><Icon n="warn" size={22} color="#8A5A00" />No ID number found. Tap "Adjust the hidden area" and drag over it.</div>}
        <div className="tick"><Icon n="ok" size={22} color="#138808" />Watermark names this exam only</div>
        <div className="tick"><Icon n="warn" size={22} color="#8A5A00" />{err || 'Please check the hidden area before you continue'}</div>
      </div>
      <div className="stack" style={{ gap: 10, marginTop: 'auto' }}>
        <button className="btn" disabled={!ready} onClick={confirm}>Looks right, continue</button>
        {adjust
          ? <button className="btn sec" onClick={() => setBoxes(boxes.slice(0, -1))}>Undo last box</button>
          : <button className="btn sec" onClick={() => setAdjust(true)}>Adjust the hidden area</button>}
        {adjust && <p className="small muted" style={{ textAlign: 'center' }}>Drag a rectangle over anything that should be hidden.</p>}
      </div>
    </div>
  )
}
