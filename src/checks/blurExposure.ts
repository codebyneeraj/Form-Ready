import type { CheckResult } from './types'

// Starting points; tune on fixtures.
const BLUR_FAIL = 20
const BLUR_WARN = 60
const DARK_MEAN = 70
const BRIGHT_MEAN = 215
const CLIP_WARN_PCT = 25 // % of near-black pixels (hair and suit alone are ~10-15%)

export function luma(img: ImageData): Float32Array {
  const { data, width, height } = img
  const g = new Float32Array(width * height)
  for (let i = 0; i < g.length; i++) g[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]
  return g
}

export function blurExposure(img: ImageData): CheckResult[] {
  const { width: w, height: h } = img
  const g = luma(img)
  let sum = 0
  let clipped = 0
  for (const v of g) {
    sum += v
    if (v <= 5) clipped++ // white clipping is expected: portals require a white background
  }
  const mean = sum / g.length
  const clipPct = (100 * clipped) / g.length

  // 4-neighbour Laplacian variance over interior pixels
  let n = 0
  let s = 0
  let s2 = 0
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      const l = g[i - 1] + g[i + 1] + g[i - w] + g[i + w] - 4 * g[i]
      n++
      s += l
      s2 += l * l
    }
  const variance = n ? s2 / n - (s / n) ** 2 : 0

  const blurTip = 'hold the camera steady and tap to focus before shooting.'
  const blur: CheckResult =
    variance < BLUR_FAIL
      ? { id: 'image.blur', status: 'warn', message: 'Photo looks blurry and may be rejected.', tip: blurTip }
      : variance < BLUR_WARN
        ? { id: 'image.blur', status: 'warn', message: 'Photo is slightly soft and may be rejected.', tip: blurTip }
        : { id: 'image.blur', status: 'pass', message: 'Photo is sharp.' }

  const exposure: CheckResult =
    mean < DARK_MEAN || mean > BRIGHT_MEAN
      ? { id: 'image.exposure', status: 'fail', message: mean < DARK_MEAN ? 'Photo is too dark.' : 'Photo is too bright.', tip: 'face a window or a steady light, and avoid direct flash.' }
      : clipPct > CLIP_WARN_PCT
        ? { id: 'image.exposure', status: 'warn', message: 'Parts of the photo are pure black or pure white and may be rejected.', tip: 'use even, softer light.' }
        : { id: 'image.exposure', status: 'pass', message: 'Lighting looks fine.' }
  return [blur, exposure]
}
