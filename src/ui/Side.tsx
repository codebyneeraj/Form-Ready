import type { SpecPack } from '../specs/schema'
import { Icon } from './icons'
import { reqText } from './util'

type Icn = Parameters<typeof Icon>[0]['n']

const FLOW: { step: string[]; icon: Icn; title: string; sub: string }[] = [
  { step: ['pick'], icon: 'card', title: 'Pick your exam', sub: 'Rules load as data, offline' },
  { step: ['add'], icon: 'upload', title: 'Add photo, signature, ID', sub: 'Any size or format' },
  { step: ['results'], icon: 'search', title: 'Rejection check', sub: 'Pixels measured on your device' },
  { step: ['privacy'], icon: 'shield', title: 'Protect your ID', sub: 'First 8 digits hidden + watermark' },
  { step: ['download'], icon: 'download', title: 'Download your kit', sub: 'Exact size, verified by re-reading the file' },
]

const CHECKS = ['One face, centred and sized right', 'Plain white, even background', 'Good light, no blur', 'Exact pixels and KB range', 'Real file type (not a renamed PNG)', 'Signature ink is dark and not cut off']

export function SideLeft({ step }: { step: string }) {
  const at = FLOW.findIndex((f) => f.step.includes(step))
  return (
    <aside className="side">
      <h2>How FormReady works</h2>
      <ol className="flow">
        {FLOW.map((f, i) => (
          <li key={f.title} className={i === at ? 'on' : i < at ? 'done' : ''}>
            <span className="node">{i < at ? <Icon n="tick" size={18} color="#fff" sw={3} /> : <Icon n={f.icon} size={20} />}</span>
            <span className="stack" style={{ gap: 2 }}>
              <span className="strong">{f.title}</span>
              <span className="small muted">{f.sub}</span>
            </span>
          </li>
        ))}
      </ol>
    </aside>
  )
}

export function SideRight({ spec }: { spec: SpecPack | null }) {
  return (
    <aside className="side">
      {spec ? (
        <section className="card">
          <h3>{spec.displayName} rules {spec.sample && <span className="muted">(sample)</span>}</h3>
          {(['photo', 'signature', 'id'] as const).map((k) => (
            <div key={k} className="rule"><span className="strong" style={{ textTransform: 'capitalize' }}>{k === 'id' ? 'ID' : k}</span><span className="small muted">{reqText(spec[k], k)}</span></div>
          ))}
          <div className="small muted">Rules verified: {spec.verifiedOn}</div>
        </section>
      ) : (
        <section className="card"><h3>Pick an exam</h3><div className="small muted">Its photo, signature and ID rules will show here.</div></section>
      )}
      <section className="card">
        <h3>What we check</h3>
        {CHECKS.map((c) => <div key={c} className="tick small strong"><Icon n="ok" size={18} color="#138808" />{c}</div>)}
      </section>
      <section className="card trust">
        <div className="tick small strong"><Icon n="lock" size={18} />Nothing is uploaded. No account.</div>
        <div className="tick small strong"><Icon n="wifioff" size={18} />Works in airplane mode.</div>
        <div className="small muted">A prediction from published rules, not a guarantee.</div>
      </section>
    </aside>
  )
}
