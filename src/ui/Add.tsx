import { useMemo } from 'react'
import type { Kind, SpecPack } from '../specs/schema'
import { Icon, KIND_ICON, KIND_LABEL } from './icons'
import { reqText, sizeText } from './util'

const KINDS: Kind[] = ['photo', 'signature', 'id']

function Slot({ kind, spec, file, wide, onFile }: { kind: Kind; spec: SpecPack; file?: File; wide: boolean; onFile: (f: File) => void }) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file])
  const take = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) onFile(f)
    e.target.value = ''
  }
  return (
    <div className={'slot ' + (file ? 'full' : '')}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f) }}>
      <label className="slot-main">
        <input className="sr" type="file" accept="image/*" onChange={take} />
        <span className={'thumb ' + (file ? 'img' : 'tint')}>
          {file ? <img src={url} alt="" /> : <Icon n={KIND_ICON[kind]} size={28} />}
        </span>
        <span className="stack" style={{ flex: 1, gap: 4 }}>
          <span className="slot-name">{KIND_LABEL[kind]}</span>
          {file && <span className="small strong">{file.name} · {sizeText(file.size)}</span>}
          <span className="small muted">{reqText(spec[kind], kind)}</span>
          {!file && <span className="orange strong">{wide ? 'Drop a file here or click to add' : 'Tap to add'}</span>}
        </span>
        {file && <span className="tickdot"><Icon n="tick" size={16} color="#fff" sw={3} /></span>}
      </label>
      {!wide && (
        <label className="cam" aria-label={`Use camera for ${KIND_LABEL[kind]}`}>
          <input className="sr" type="file" accept="image/*" capture={kind === 'photo' ? 'user' : 'environment'} onChange={take} />
          <Icon n="camera" />
        </label>
      )}
    </div>
  )
}

export function Add({ spec, files, wide, onFile, onCheck, onBack }: {
  spec: SpecPack; files: Partial<Record<Kind, File>>; wide: boolean
  onFile: (k: Kind, f: File) => void; onCheck: () => void; onBack: () => void
}) {
  return (
    <div className={wide ? 'stack' : 'screen'} style={wide ? { gap: 16 } : undefined}>
      {!wide && (
        <div className="head">
          <button className="back" aria-label="Back to exam list" onClick={onBack}><Icon n="back" /></button>
          <div className="stack" style={{ gap: 2 }}>
            <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.2 }}>{spec.displayName}</div>
            <div className="small green strong">Rules verified: {spec.verifiedOn}</div>
          </div>
        </div>
      )}
      <div className="stack" style={{ gap: 6 }}>
        <h1 style={{ fontSize: wide ? 30 : 24 }}>Add your files</h1>
        <p className="muted">{wide ? 'Any size or format. Everything is checked on this computer.' : "Any size or format. We make them fit this exam's rules."}</p>
      </div>
      <div className="stack" style={{ gap: 12 }}>
        {KINDS.map((k) => <Slot key={k} kind={k} spec={spec} file={files[k]} wide={wide} onFile={(f) => onFile(k, f)} />)}
      </div>
      <div className="stack" style={{ gap: 12, marginTop: 'auto' }}>
        <div className="small muted strong" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon n="lock" size={18} color="#5A5A5A" />{wide ? 'Nothing is uploaded. Files stay on this computer.' : 'Files stay on this phone.'}
        </div>
        <button className="btn" disabled={!Object.keys(files).length} onClick={onCheck}>Check my files</button>
      </div>
    </div>
  )
}

