import type { CheckResult } from './types'
import { luma } from './blurExposure'

// Starting points; tune on fixtures.
const MIN_CONTRAST = 80 // paper mean minus ink mean (0-255)
const WARN_CONTRAST = 120
const PAPER_MIN = 190 // paper mean luminance below this = not near white
const EDGE_INK_PCT = 0.5 // % of edge pixels that are ink
const MIN_INK_PCT = 0.05
const MAX_INK_PCT = 25 // a signature is thin strokes on mostly blank paper
const MAX_CHROMA = 25 // mean max-min channel spread; photos of people/scenes are colourful, scans are not

function otsu(g: Float32Array): number {
  const hist = new Array<number>(256).fill(0)
  for (const v of g) hist[v | 0]++
  let sumAll = 0
  for (let i = 0; i < 256; i++) sumAll += i * hist[i]
  let wB = 0
  let sumB = 0
  let best = 0
  let thr = 128
  for (let t = 0; t < 256; t++) {
    wB += hist[t]
    if (!wB) continue
    const wF = g.length - wB
    if (!wF) break
    sumB += t * hist[t]
    const d = sumB / wB - (sumAll - sumB) / wF
    const between = wB * wF * d * d
    if (between > best) {
      best = between
      thr = t
    }
  }
  return thr
}

export function chroma(img: ImageData): number {
  const d = img.data
  let c = 0
  for (let i = 0; i < d.length; i += 4) c += Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2])
  return (c * 4) / d.length
}

export function signature(img: ImageData): CheckResult[] {
  const { width: w, height: h } = img
  const g = luma(img)
  const thr = otsu(g)
  let inkN = 0
  let inkS = 0
  let paperN = 0
  let paperS = 0
  let edgeN = 0
  let edgeInk = 0
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const v = g[y * w + x]
      const ink = (v | 0) <= thr // thr is a histogram bin, so compare bins
      if (ink) {
        inkN++
        inkS += v
      } else {
        paperN++
        paperS += v
      }
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) {
        edgeN++
        if (ink) edgeInk++
      }
    }
  // shortcut: a blank page still splits at some Otsu threshold; only the min-ink guard catches it, harden when fixtures show false passes.
  if (!inkN || !paperN || (100 * inkN) / g.length < MIN_INK_PCT)
    return [{ id: 'sig.contrast', status: 'fail', message: 'No signature found.', tip: 'use a dark pen' }]
  const inkPct = (100 * inkN) / g.length
  const col = chroma(img)
  if (inkPct > MAX_INK_PCT || col > MAX_CHROMA)
    return [{ id: 'sig.notsignature', status: 'fail', message: "This doesn't look like a signature.", tip: 'sign on plain white paper and photograph just the signature.' }]
  const paper = paperS / paperN
  const contrast = paper - inkS / inkN

  return [
    contrast < MIN_CONTRAST
      ? { id: 'sig.contrast', status: 'fail', message: 'Signature is too faint.', tip: 'use a dark pen' }
      : contrast < WARN_CONTRAST
        ? { id: 'sig.contrast', status: 'warn', message: 'Signature is a little light and may be rejected.', tip: 'use a dark pen' }
        : { id: 'sig.contrast', status: 'pass', message: 'Signature is clear.' },
    (100 * edgeInk) / edgeN > EDGE_INK_PCT
      ? { id: 'sig.cutoff', status: 'warn', message: 'Signature touches the edge and may be cut off.', tip: 'leave a small blank margin around it.' }
      : { id: 'sig.cutoff', status: 'pass', message: 'Signature is fully inside the image.' },
    paper < PAPER_MIN
      ? { id: 'sig.paper', status: 'warn', message: 'Paper looks grey or shadowed and may be rejected.', tip: 'sign on plain white paper in bright, even light.' }
      : { id: 'sig.paper', status: 'pass', message: 'Paper is white.' },
  ]
}
