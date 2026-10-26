import { useState } from 'react'
import { specs } from '../specs'
import type { SpecPack } from '../specs/schema'
import { Icon } from './icons'

export function Pick({ onPick, offline, wide }: { onPick: (s: SpecPack) => void; offline: boolean; wide: boolean }) {
  const [q, setQ] = useState('')
  const list = specs.filter((s) => s.displayName.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="screen" style={{ paddingTop: 28 }}>
      {!wide && (
        <div className="head" style={{ justifyContent: 'space-between' }}>
          <Logo />
          {offline && <Offline />}
        </div>
      )}
      <div className="stack" style={{ gap: 8 }}>
        <h1>Which form are you filling?</h1>
        <p className="muted">Pick your exam. We check your photo, signature and ID against its rules, on your phone.</p>
      </div>
      <div style={{ position: 'relative' }}>
        <label htmlFor="q" className="sr">Search exams</label>
        <span style={{ position: 'absolute', left: 14, top: 15 }}><Icon n="search" color="#5A5A5A" /></span>
        <input id="q" className="search" type="text" placeholder="Search exams" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="stack" style={{ gap: 12 }}>
        {list.map((s) => (
          <button key={s.portal} className="exam" onClick={() => onPick(s)}>
            <span className="iconbox" style={s.logo ? { background: '#fff', border: '1.5px solid #E6E6E6' } : s.badge ? { background: s.badge.color, color: '#fff', font: '800 13px Montserrat', letterSpacing: 0.3 } : undefined}>
              {s.logo ? <img src={s.logo} alt="" width={36} height={36} style={{ objectFit: 'contain' }} /> : s.badge ? s.badge.text : <Icon n="card" size={22} />}
            </span>
            <span className="stack" style={{ flex: 1, gap: 3 }}>
              <span className="exam-name">{s.displayName} {s.sample && <span className="muted">(sample)</span>}</span>
              <span className="small muted">Photo · Signature · ID</span>
              <span className="small green">Rules verified: {s.verifiedOn}</span>
            </span>
            <Icon n="next" color="#5A5A5A" />
          </button>
        ))}
      </div>
      <div className="note" style={{ marginTop: 'auto' }}>
        <Icon n="lock" size={22} color="#1A1A1A" />
        Nothing leaves your phone. No upload, no account.
      </div>
    </div>
  )
}

export const Logo = () => <div className="logo">Form<span>Ready</span></div>
export const Offline = () => <div className="badge"><Icon n="ok" size={14} sw={2.2} />Ready offline</div>
