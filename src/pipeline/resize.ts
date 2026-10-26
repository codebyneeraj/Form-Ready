type Cv = OffscreenCanvas | HTMLCanvasElement
type Ctx = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D

export function canvas(w: number, h: number): Cv {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h)
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  return c
}

// White fill first so transparent PNGs do not turn black in JPEG.
function draw(src: CanvasImageSource, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number, c: Cv) {
  const g = c.getContext('2d') as Ctx
  g.fillStyle = '#fff'
  g.fillRect(0, 0, c.width, c.height)
  g.imageSmoothingQuality = 'high'
  g.drawImage(src, sx, sy, sw, sh, dx, dy, dw, dh)
  return c
}

// Halve repeatedly while at least 2x too big, then final scale to exact w x h.
function scaleTo(src: Cv, w: number, h: number, dx = 0, dy = 0, out = canvas(w, h)): Cv {
  let cur = src
  while (cur.width >= 2 * w && cur.height >= 2 * h) {
    const half = canvas(cur.width >> 1, cur.height >> 1)
    draw(cur, 0, 0, cur.width, cur.height, 0, 0, half.width, half.height, half)
    cur = half
  }
  return draw(cur, 0, 0, cur.width, cur.height, dx, dy, w, h, out)
}

export type Rect = { x: number; y: number; w: number; h: number }

// Crop window of aspect `ar` around the face so the head (box * headFactor) fills `target` of its height.
// Head spans about 0.4 box-heights above the box to 0.1 below it. Clamped inside the image.
export function faceCrop(imgW: number, imgH: number, box: { x: number; y: number; width: number; height: number }, ar: number, headFactor: number, target: number): Rect {
  const ch = Math.min((box.height * headFactor) / target, imgH, imgW / ar)
  const cw = ch * ar
  const x = Math.min(Math.max(box.x + box.width / 2 - cw / 2, 0), imgW - cw)
  const y = Math.min(Math.max(box.y + box.height * 0.35 - ch / 2, 0), imgH - ch)
  return { x: Math.round(x), y: Math.round(y), w: Math.round(cw), h: Math.round(ch) }
}

export function resizePhoto(bmp: ImageBitmap, [w, h]: [number, number], at?: Rect): Cv {
  const ar = w / h
  let cw = bmp.width, ch = bmp.height
  if (cw / ch > ar) cw = Math.round(ch * ar); else ch = Math.round(cw / ar)
  const { x: sx, y: sy } = at ?? { x: (bmp.width - cw) >> 1, y: (bmp.height - ch) >> 1 }
  if (at) { cw = at.w; ch = at.h }
  const crop = draw(bmp, sx, sy, cw, ch, 0, 0, cw, ch, canvas(cw, ch))
  return scaleTo(crop, w, h)
}

function otsu(gray: Uint8Array): number {
  const hist = new Array(256).fill(0)
  for (const v of gray) hist[v]++
  let sum = 0
  for (let i = 0; i < 256; i++) sum += i * hist[i]
  let wB = 0, sB = 0, best = 0, t = 128
  for (let i = 0; i < 256; i++) {
    wB += hist[i]
    if (!wB) continue
    const wF = gray.length - wB
    if (!wF) break
    sB += i * hist[i]
    const d = sB / wB - (sum - sB) / wF
    const v = wB * wF * d * d
    if (v > best) { best = v; t = i }
  }
  return t
}

// Ink = pixels at or below the Otsu threshold. Returns null when the page is blank.
export function inkBBox(rgba: Uint8ClampedArray, w: number, h: number) {
  const gray = new Uint8Array(w * h)
  for (let i = 0; i < gray.length; i++) gray[i] = (rgba[i * 4] * 77 + rgba[i * 4 + 1] * 150 + rgba[i * 4 + 2] * 29) >> 8
  let min = 255, max = 0
  for (const v of gray) { if (v < min) min = v; if (v > max) max = v }
  if (max - min < 20) return null
  const t = otsu(gray)
  let x0 = w, y0 = h, x1 = -1, y1 = -1
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (gray[y * w + x] <= t) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

export function resizeSignature(bmp: ImageBitmap, [w, h]: [number, number]): Cv {
  const full = draw(bmp, 0, 0, bmp.width, bmp.height, 0, 0, bmp.width, bmp.height, canvas(bmp.width, bmp.height))
  const px = (full.getContext('2d') as Ctx).getImageData(0, 0, bmp.width, bmp.height)
  const b = inkBBox(px.data, px.width, px.height) ?? { x: 0, y: 0, w: bmp.width, h: bmp.height }
  const pad = Math.round(Math.max(b.w, b.h) * 0.05)
  const x = Math.max(0, b.x - pad), y = Math.max(0, b.y - pad)
  const cw = Math.min(bmp.width - x, b.w + 2 * pad), ch = Math.min(bmp.height - y, b.h + 2 * pad)
  const crop = draw(full, x, y, cw, ch, 0, 0, cw, ch, canvas(cw, ch))
  const s = Math.min(w / cw, h / ch)
  const tw = Math.max(1, Math.round(cw * s)), th = Math.max(1, Math.round(ch * s))
  return scaleTo(crop, tw, th, (w - tw) >> 1, (h - th) >> 1, canvas(w, h))
}

// shortcut: ID is only capped to 2000px on the long side, not fit to any spec px, upgrade if a portal sets ID dimensions.
export function resizeId(bmp: ImageBitmap, max = 2000): Cv {
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * s), h = Math.round(bmp.height * s)
  const c = draw(bmp, 0, 0, bmp.width, bmp.height, 0, 0, bmp.width, bmp.height, canvas(bmp.width, bmp.height))
  return scaleTo(c, w, h)
}

export async function encodeJpeg(c: Cv, q: number): Promise<Blob> {
  if ('convertToBlob' in c) return c.convertToBlob({ type: 'image/jpeg', quality: q })
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('encode failed'))), 'image/jpeg', q))
}
