import type { FileRule } from '../specs/schema'
import type { Kind } from '../specs/schema'

export const kb = (bytes: number) => Math.round(bytes / 1024)
export const sizeText = (bytes: number) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${kb(bytes)} KB`)

export function reqText(r: FileRule, kind: Kind) {
  return [
    r.px && `${r.px[0]} × ${r.px[1]} px`,
    r.kb && `${r.kb[0]}–${r.kb[1]} KB`,
    r.format === 'jpeg' ? 'JPEG' : 'PDF',
    r.background && (kind === 'signature' ? 'white paper' : 'white background'),
    r.maxKB && `up to ${r.maxKB} KB`,
  ].filter(Boolean).join(' · ')
}
