import { describe, expect, it } from 'vitest'
import { background, blurExposure, faceChecks, signature } from './index'

const make = (w: number, h: number, f: (x: number, y: number) => [number, number, number]) => {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const [r, g, b] = f(x, y)
      data.set([r, g, b, 255], (y * w + x) * 4)
    }
  return { data, width: w, height: h } as ImageData
}
const st = (r: { id: string; status: string }[], id: string) => r.find((c) => c.id === id)?.status
const noise = (x: number, y: number) => (x * 7919 + y * 104729) % 256

describe('background', () => {
  it('passes even white', () => {
    const r = background(make(100, 100, () => [250, 250, 250]))
    expect(st(r, 'bg.even')).toBe('pass')
    expect(st(r, 'bg.color')).toBe('pass')
  })
  it('fails shadow gradient', () => {
    expect(st(background(make(100, 100, (x) => [255 - x * 1.5, 255 - x * 1.5, 255 - x * 1.5])), 'bg.even')).toBe('fail')
  })
  it('fails non-white', () => {
    expect(st(background(make(50, 50, () => [100, 140, 200])), 'bg.color')).toBe('fail')
  })
  it('ignores the face box', () => {
    const img = make(100, 100, (x, y) => (y < 10 && x > 30 && x < 60 ? [0, 0, 0] : [255, 255, 255]))
    expect(st(background(img, { x: 30, y: 0, width: 31, height: 60 }), 'bg.even')).toBe('pass')
  })
})

describe('blurExposure', () => {
  it('flat grey is blurry', () => expect(st(blurExposure(make(60, 60, () => [128, 128, 128])), 'image.blur')).toBe('warn'))
  it('sharp noise is sharp', () => expect(st(blurExposure(make(60, 60, (x, y) => [noise(x, y), noise(x, y), noise(x, y)])), 'image.blur')).toBe('pass'))
  it('flags dark and bright', () => {
    expect(st(blurExposure(make(20, 20, () => [20, 20, 20])), 'image.exposure')).toBe('fail')
    expect(st(blurExposure(make(20, 20, () => [250, 250, 250])), 'image.exposure')).toBe('fail')
  })
})

describe('signature', () => {
  const sig = (inkAtEdge = false, paper = 250, ink = 20) =>
    make(100, 50, (x, y) => ((y === 25 && x > 10 && x < 90) || (inkAtEdge && x === 0 && y > 10 && y < 40) ? [ink, ink, ink] : [paper, paper, paper]))
  it('good signature passes', () => expect(signature(sig()).every((c) => c.status === 'pass')).toBe(true))
  it('faint ink fails', () => expect(st(signature(sig(false, 250, 200)), 'sig.contrast')).toBe('fail'))
  it('edge ink and grey paper warn', () => {
    expect(st(signature(sig(true)), 'sig.cutoff')).toBe('warn')
    expect(st(signature(sig(false, 150, 10)), 'sig.paper')).toBe('warn')
  })
})

describe('faceChecks', () => {
  const rule = { count: 1 as const, minHeightRatio: 0.5, maxHeightRatio: 0.8 }
  const f = (x: number, y: number, w: number, h: number, score = 0.9) => ({ box: { x, y, width: w, height: h }, score })
  it.each([
    ['none', [], 'face.count', 'fail'],
    ['two', [f(0, 0, 10, 10), f(50, 0, 10, 10)], 'face.count', 'fail'],
    ['good', [f(35, 30, 30, 40)], 'face.size', 'pass'],
    ['small', [f(40, 40, 20, 30)], 'face.size', 'fail'],
    ['large', [f(10, 5, 80, 90)], 'face.size', 'fail'],
    ['real passport photo', [f(211, 168, 227, 227)], 'face.size', 'pass'],
    ['off-centre', [f(0, 30, 30, 40)], 'face.centre', 'warn'],
    ['cut off', [f(35, 0, 30, 60)], 'face.centre', 'fail'],
    ['unclear', [f(35, 30, 30, 40, 0.4)], 'face.confidence', 'warn'],
  ])('%s', (_n, faces, id, status) => {
    expect(st(faceChecks(faces, faces[0] && faces[0].box.width > 100 ? 640 : 100, faces[0] && faces[0].box.width > 100 ? 640 : 100, rule), id)).toBe(status)
  })
  it('one good face all pass', () => expect(faceChecks([f(35, 30, 30, 40)], 100, 100, rule).every((c) => c.status === 'pass')).toBe(true))
})

describe('signature two-level ink', () => {
  it('finds thin blue-black ink on near-white paper', () => {
    const w = 200, h = 80, data = new Uint8ClampedArray(w * h * 4).fill(250)
    for (let x = 20; x < 180; x++) for (let y = 38; y < 42; y++) data.set([20, 20, 60, 255], (y * w + x) * 4)
    expect(signature({ data, width: w, height: h } as ImageData).find((c) => c.message === 'No signature found.')).toBeUndefined()
  })
  it('rejects a colourful, mostly-dark photo as not a signature', () => {
    const w = 100, h = 100, data = new Uint8ClampedArray(w * h * 4)
    for (let i = 0; i < w * h; i++) data.set(i % 2 ? [190, 120, 90, 255] : [40, 30, 25, 255], i * 4)
    expect(signature({ data, width: w, height: h } as ImageData)[0].id).toBe('sig.notsignature')
  })
})
