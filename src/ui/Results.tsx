import { useMemo } from 'react'
import type { CheckResult } from '../checks/types'
import type { ProcessResult } from '../pipeline/types'
import type { Kind, SpecPack } from '../specs/schema'
import { Back, Icon, KIND_LABEL } from './icons'
import { kb } from './util'

export type Outcome = ProcessResult | string // string = processing error
const ROW = { pass: ['ok', '#138808', 'Pass'], warn: ['warn', '#8A5A00', 'Check'], fail: ['no', '#B3261E', 'Retake'] } as const

export const failCount = (o: Outcome) => (typeof o === 'string' ? 1 : o.checks.filter((c) => c.status === 'fail').length)

function Row({ c }: { c: CheckResult }) {
  const [icon, color, label] = ROW[c.status]
  return (
    <div className={'row ' + c.status}>
      <div className="row-top">
        <Icon n={icon} size={24} color={color} />
        <div style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{c.message}</div>
        <div className="small strong" style={{ color: c.status === 'pass' ? '#0E6B06' : c.status === 'fail' ? '#8C1A14' : '#8A5A00' }}>{label}</div>
      </div>
      {c.tip && c.status !== 'pass' && <div className="tip">Tip: {c.tip}</div>}
    </div>
  )
}

function Table({ spec, kind, r }: { spec: SpecPack; kind: Kind; r: ProcessResult }) {
  const rule = spec[kind], m = r.measured
  const rows: [string, string, string, boolean][] = []
  if (rule.px) rows.push(['Size', `${rule.px[0]} × ${rule.px[1]} px`, `${m.width} × ${m.height} px`, m.width === rule.px[0] && m.height === rule.px[1]])
  const max = rule.kb?.[1] ?? rule.maxKB
  if (max) rows.push(['File size', rule.kb ? `${rule.kb[0]}–${rule.kb[1]} KB` : `up to ${max} KB`, `${kb(m.bytes)} KB`, kb(m.bytes) <= max && (!rule.kb || kb(m.bytes) >= rule.kb[0])])
  // ID leaves the pipeline as an image and becomes a PDF at export, so its format is not compared here.
  if (kind !== 'id') rows.push(['Format', rule.format.toUpperCase(), m.format.toUpperCase(), m.format === rule.format])
  return (
    <div className="table">
      <div className="tr th"><div>Check</div><div>Required</div><div>Yours</div></div>
      {rows.map(([a, b, c, ok]) => (
        <div className="tr" key={a}><div className="strong">{a}</div><div className="muted">{b}</div><div className="strong" style={{ color: ok ? '#0E6B06' : '#8C1A14' }}>{c}</div></div>
      ))}
    </div>
  )
}

function Section({ spec, kind, o, onRetake, wide }: { spec: SpecPack; kind: Kind; o: Outcome; onRetake: () => void; wide: boolean }) {
  const r = typeof o === 'string' ? null : o
  const url = useMemo(() => (r && r.measured.format !== 'pdf' ? URL.createObjectURL(r.blob) : ''), [r])
  const fails = failCount(o), warns = r ? r.checks.filter((c) => c.status === 'warn').length : 0
  return (
    <section className="stack" style={{ gap: 16 }}>
      <div className={'banner ' + (fails ? 'bad' : 'good')}>
        <Icon n={fails ? 'warn' : 'ok'} size={26} color={fails ? '#B3261E' : '#138808'} />
        <div className="stack" style={{ gap: 2 }}>
          <div className="banner-t">{KIND_LABEL[kind]}{wide ? ' is ' : ': '}{fails ? 'likely to be rejected' : 'low risk of rejection'}</div>
          <div className="small muted strong">
            {fails ? `${fails} thing${fails > 1 ? 's' : ''} need${fails > 1 ? '' : 's'} a retake` : warns ? `${warns} to double-check` : `All ${r?.checks.length} checks passed`}
          </div>
        </div>
      </div>
      {typeof o === 'string' ? (
        <div className="row fail"><div className="row-top"><Icon n="no" size={24} color="#B3261E" /><div style={{ fontSize: 14, fontWeight: 700 }}>Could not process this file</div></div><div className="tip">{o}</div></div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div className="thumb img" style={{ width: 72, height: 86 }}>{url ? <img src={url} alt="" /> : <Icon n="file" size={32} color="#8A8A8A" />}</div>
            <div className="stack" style={{ gap: 4 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{KIND_LABEL[kind]}</div>
              <div className="small muted">{o.measured.width} × {o.measured.height} px · {kb(o.measured.bytes)} KB</div>
            </div>
          </div>
          <div className="stack" style={{ gap: 10 }}>{o.checks.map((c) => <Row key={c.id} c={c} />)}</div>
          <Table spec={spec} kind={kind} r={o} />
        </>
      )}
      {fails > 0 && <button className="btn" onClick={onRetake}><Icon n="camera" color="#fff" />Retake {KIND_LABEL[kind].toLowerCase()}</button>}
    </section>
  )
}

export function Results({ spec, results, busy, wide, hasId, onRetake, onContinue, onSkip, onBack }: {
  spec: SpecPack; results: Partial<Record<Kind, Outcome>>; busy: boolean; wide: boolean; hasId: boolean
  onRetake: (k: Kind) => void; onContinue: () => void; onSkip: () => void; onBack: () => void
}) {
  const entries = Object.entries(results) as [Kind, Outcome][]
  const anyFail = entries.some(([, o]) => failCount(o) > 0)
  return (
    <div className={wide ? 'stack' : 'screen'} style={wide ? { gap: 16 } : undefined}>
      {!wide && <Back onClick={onBack} label="Back to add files" title="Checks" />}
      {busy && <p className="muted">Checking on this {wide ? 'computer' : 'phone'}…</p>}
      {entries.map(([k, o]) => <Section key={k} spec={spec} kind={k} o={o} wide={wide} onRetake={() => onRetake(k)} />)}
      {!busy && entries.length > 0 && (
        <>
          <p className="small muted">This is a prediction from the exam's published rules. It is not a guarantee.</p>
          <div className={wide ? 'actions' : 'stack'} style={{ gap: 10, marginTop: wide ? 0 : 'auto' }}>
            <button className={anyFail ? 'btn sec' : 'btn'} onClick={onContinue}>
              {anyFail ? 'Continue anyway' : hasId ? <><Icon n="shield" color="#fff" />Protect my ID</> : 'Go to download'}
            </button>
            {!anyFail && hasId && <button className="btn sec" onClick={onSkip}>Skip, go to download</button>}
          </div>
        </>
      )}
      {wide && !busy && entries.length === 0 && <p className="muted">Add your files and press Check my files. Results appear here.</p>}
    </div>
  )
}
