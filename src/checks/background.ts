import type { CheckResult } from './types'

// Starting points; tune on fixtures.
const SIDE_REACH = 0.6 // side strips stop here: shoulders and clothes sit below, and are not background
const STRIP = 0.06 // strip thickness as fraction of the short side
const MAX_STD = 18 // per-channel std-dev above this = uneven
const WARN_STD = 10
const WHITE_FAIL = 40 // distance of the darkest channel mean from 255
const WHITE_WARN = 20

export type Box = { x: number; y: number; width: number; height: number }

export function background(img: ImageData, faceBox?: Box, _required: 'white' = 'white'): CheckResult[] {
  const { data, width: w, height: h } = img
  const t = Math.max(1, Math.round(Math.min(w, h) * STRIP))
  const inFace = (x: number, y: number) =>
    !!faceBox && x >= faceBox.x && x < faceBox.x + faceBox.width && y >= faceBox.y && y < faceBox.y + faceBox.height
  const sum = [0, 0, 0]
  const sq = [0, 0, 0]
  let n = 0
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!((y < h * SIDE_REACH && (x < t || x >= w - t)) || y < t) || inFace(x, y)) continue
      n++
      for (let c = 0; c < 3; c++) {
        const v = data[(y * w + x) * 4 + c]
        sum[c] += v
        sq[c] += v * v
      }
    }
  if (!n) return []
  const mean = sum.map((s) => s / n)
  const std = Math.max(...sq.map((q, c) => Math.sqrt(Math.max(0, q / n - mean[c] ** 2))))
  const off = 255 - Math.min(...mean)

  const evenTip = 'stand facing a window, with a plain wall behind you.'
  const even: CheckResult =
    std > MAX_STD
      ? { id: 'bg.even', status: 'fail', message: 'Background is uneven or has shadows.', tip: evenTip }
      : std > WARN_STD
        ? { id: 'bg.even', status: 'warn', message: 'Background is slightly uneven and may be rejected.', tip: evenTip }
        : { id: 'bg.even', status: 'pass', message: 'Background is even.' }
  const colorTip = 'stand in front of a plain white wall or sheet.'
  const color: CheckResult =
    off > WHITE_FAIL
      ? { id: 'bg.color', status: 'fail', message: 'Background is not white.', tip: colorTip }
      : off > WHITE_WARN
        ? { id: 'bg.color', status: 'warn', message: 'Background is off-white or greyish and may be rejected.', tip: colorTip }
        : { id: 'bg.color', status: 'pass', message: 'Background is white.' }
  return [even, color]
}
