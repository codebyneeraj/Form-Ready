import { useEffect, useState } from 'react'
import { downloadAll, downloadBlob } from '../export/download'
import { buildKitPdf } from '../export/pdf'
import type { Kind, SpecPack } from '../specs/schema'
import { Back, Icon, KIND_ICON } from './icons'
import { failCount, type Outcome } from './Results'
import { kb } from './util'

type Item = { name: string; blob: Blob; note: string; kind: Kind; over?: boolean }

export function Download({ spec, results, idBlob, masked, onBack }: {
  spec: SpecPack; results: Partial<Record<Kind, Outcome>>; idBlob?: Blob; masked: boolean; onBack: () => void
}) {
  const [items, setItems] = useState<Item[] | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    ;(async () => {
      const out: Item[] = []
      for (const k of ['photo', 'signature'] as const) {
        const r = results[k]
        if (r && typeof r !== 'string') out.push({ kind: k, name: k + '.jpg', blob: r.blob, note: `${r.measured.width} × ${r.measured.height} px · ${kb(r.measured.bytes)} KB` })
      }
      if (idBlob) {
        const pdf = await buildKitPdf([{ blob: idBlob }], spec.id.maxKB ?? 200)
        out.push({ kind: 'id', name: masked ? 'id-masked.pdf' : 'id.pdf', blob: pdf, note: `${masked ? 'Digits hidden · ' : ''}${kb(pdf.size)} KB`, over: spec.id.maxKB !== undefined && kb(pdf.size) > spec.id.maxKB })
      }
      setItems(out)
    })().catch((e) => setErr(String(e)))
  }, [spec, results, idBlob, masked])

  const risky = Object.values(results).some((o) => o && failCount(o) > 0) || items?.some((i) => i.over)
  return (
    <div className="screen">
      <Back onClick={onBack} label="Back" title="Your kit" />
      <div className={'hero ' + (risky ? 'amber' : '')}>
        <div className="tickdot big"><Icon n={risky ? 'warn' : 'tick'} size={28} color="#fff" sw={3} /></div>
        <h1 style={{ fontSize: 26, color: risky ? '#5C3B00' : '#0A3D06' }}>{risky ? 'Review before you upload' : 'Ready to upload'}</h1>
        <div style={{ fontSize: 14, lineHeight: 1.5, fontWeight: 500, color: '#3D3D3D' }}>
          {risky ? 'Some files may still be rejected.' : `${items?.length ?? ''} files, each matched to this exam's rules.`}
        </div>
      </div>
      {err && <p className="tip">{err}</p>}
      <div className="stack" style={{ gap: 10 }}>
        {(items ?? []).map((i) => (
          <div className="file" key={i.name}>
            <span className={'iconbox ' + (i.kind === 'signature' ? 'g' : '')}><Icon n={i.kind === 'id' ? 'file' : KIND_ICON[i.kind]} size={22} /></span>
            <div className="stack" style={{ flex: 1, gap: 2 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{i.name}</div>
              <div className="small muted" style={i.over ? { color: '#8C1A14', fontWeight: 700 } : undefined}>{i.note}</div>
            </div>
            <button className="back" aria-label={`Download ${i.name}`} onClick={() => downloadBlob(i.blob, i.name)}><Icon n="download" /></button>
          </div>
        ))}
      </div>
      <div className="note"><Icon n="wifioff" size={22} color="#1A1A1A" />Nothing was uploaded. This works in airplane mode.</div>
      <div className="stack" style={{ gap: 10, marginTop: 'auto' }}>
        <button className="btn" disabled={!items?.length} onClick={() => downloadAll(items!)}><Icon n="download" color="#fff" />Download all</button>
        <div className="small muted" style={{ textAlign: 'center' }}>Rules verified: {spec.verifiedOn} · source: {spec.sample ? 'sample rules, not an official notice' : 'official notification'}</div>
      </div>
    </div>
  )
}
