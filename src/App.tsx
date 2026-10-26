import { useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import type { Kind, SpecPack } from './specs/schema'
import { processImage } from './pipeline'
import { Add } from './ui/Add'
import { Download } from './ui/Download'
import { Logo, Offline, Pick } from './ui/Pick'
import { Privacy } from './ui/Privacy'
import { SideLeft, SideRight } from './ui/Side'
import { Results, type Outcome } from './ui/Results'

type Step = 'pick' | 'add' | 'results' | 'privacy' | 'download'
type Outcomes = Partial<Record<Kind, Outcome>>

const without = <T extends object>(o: T, k: keyof T) => Object.fromEntries(Object.entries(o).filter(([key]) => key !== k)) as T

export default function App() {
  const wide = false // laptops get the phone UI inside a device frame (index.css), not a separate layout
  const { offlineReady: [offline] } = useRegisterSW()
  const [step, setStep] = useState<Step>('pick')
  const [spec, setSpec] = useState<SpecPack | null>(null)
  const [files, setFiles] = useState<Partial<Record<Kind, File>>>({})
  const [results, setResults] = useState<Outcomes>({})
  const [busy, setBusy] = useState(false)
  const [idOut, setIdOut] = useState<{ blob: Blob; masked: boolean } | null>(null)

  const setFile = (k: Kind, f: File) => {
    setFiles((o) => ({ ...o, [k]: f }))
    setResults((o) => without(o, k))
  }
  const check = async () => {
    if (!spec) return
    setStep('results'); setBusy(true); setResults({}); setIdOut(null)
    const entries = await Promise.all((Object.entries(files) as [Kind, File][]).map(async ([k, f]): Promise<[Kind, Outcome]> => {
      try { return [k, await processImage(f, spec, k)] } catch (e) { return [k, e instanceof Error ? e.message : String(e)] }
    }))
    setResults(Object.fromEntries(entries))
    setBusy(false)
  }
  const retake = (k: Kind) => {
    setFiles((o) => without(o, k))
    setResults((o) => without(o, k))
    setStep('add')
  }
  const idResult = results.id
  const idProcessed = idResult && typeof idResult !== 'string' ? idResult : undefined
  const skipToDownload = () => { setIdOut(null); setStep('download') }

  const resultsView = spec && (
    <Results spec={spec} results={results} busy={busy} wide={wide} hasId={!!idProcessed}
      onRetake={retake} onSkip={skipToDownload} onBack={() => setStep('add')}
      onContinue={() => (idProcessed ? setStep('privacy') : skipToDownload())} />
  )
  const addView = spec && <Add spec={spec} files={files} wide={wide} onFile={setFile} onCheck={check} onBack={() => setStep('pick')} />

  let body
  if (!spec || step === 'pick') body = <Pick wide={wide} offline={offline} onPick={(s) => { setSpec(s); setFiles({}); setResults({}); setStep('add') }} />
  else if (step === 'add' || step === 'results') {
    body = wide
      ? <div className="cols"><div className="col">{addView}</div><div className="col r">{resultsView}</div></div>
      : step === 'add' ? addView : resultsView
  } else if (step === 'privacy' && idProcessed) {
    body = <Privacy idBlob={idProcessed.blob} examName={spec.displayName} onBack={() => setStep('results')} onDone={(blob, masked) => { setIdOut({ blob, masked }); setStep('download') }} />
  } else {
    body = <Download spec={spec} results={results} idBlob={idOut?.blob ?? idProcessed?.blob} masked={!!idOut?.masked} onBack={() => setStep(idProcessed ? 'privacy' : 'results')} />
  }

  return (
    <div className="stage">
      <SideLeft step={step} />
    <div className="device"><div className="notch" />
      {wide && (
        <header className="top">
          <Logo />
          <div className="head" style={{ gap: 12 }}>
            {spec && <div style={{ fontSize: 14, fontWeight: 700 }}>{spec.displayName} {spec.sample && <span className="muted">(sample)</span>}</div>}
            {offline && <Offline />}
          </div>
        </header>
      )}
      <main className={wide ? 'wide' : 'phone'}>{body}</main>
    </div>
      <SideRight spec={spec} />
    </div>
  )
}
