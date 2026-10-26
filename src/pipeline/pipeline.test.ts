import { describe, expect, it } from 'vitest'
import { compress, padJpeg } from './compress'
import { formatCheck, sniff } from './format'
import { inkBBox } from './resize'

// size grows with quality, like a real encoder
const fake = (q: number) => new Uint8Array(Math.round(200 + q * q * 100000)).fill(1)

describe('compress', () => {
  it('lands in range', async () => {
    const r = await compress(async (q) => fake(q), 20_000, 50_000)
    expect(r.bytes.length).toBeGreaterThanOrEqual(20_000)
    expect(r.bytes.length).toBeLessThanOrEqual(50_000)
  })
  it('flags too big at lowest quality', async () => {
    expect((await compress(async (q) => fake(q), 0, 100)).tooBig).toBe(true)
  })
  it('pads when too small even at top quality', async () => {
    const jpg = new Uint8Array([0xff, 0xd8, 1, 2, 3, 0xff, 0xd9])
    const r = await compress(async () => new Blob([jpg]), 150_000, 200_000)
    expect(r.bytes.length).toBe(150_000)
  })
})

describe('padJpeg', () => {
  it('keeps SOI/EOI and hits min', () => {
    const jpg = new Uint8Array([0xff, 0xd8, 9, 9, 0xff, 0xd9])
    for (const min of [10, 70_000, 200_001]) {
      const p = padJpeg(jpg, min)
      expect(p.length).toBe(min)
      expect([p[0], p[1]]).toEqual([0xff, 0xd8])
      expect([p[p.length - 2], p[p.length - 1]]).toEqual([0xff, 0xd9])
    }
  })
})

describe('format', () => {
  it('sniffs magic bytes', () => {
    expect(sniff(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpeg')
    expect(sniff(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe('png')
    expect(sniff(new TextEncoder().encode('%PDF-1.4'))).toBe('pdf')
    expect(sniff(new Uint8Array([1, 2, 3, 4]))).toBe('unknown')
  })
  it('flags PNG renamed to .jpg', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
    expect(formatCheck('a.jpg', png).status).toBe('warn')
    expect(formatCheck('a.png', png).status).toBe('pass')
  })
})

describe('inkBBox', () => {
  it('finds dark block on white', () => {
    const w = 20, h = 10, d = new Uint8ClampedArray(w * h * 4).fill(255)
    for (let y = 3; y < 6; y++) for (let x = 5; x < 12; x++) d.fill(0, (y * w + x) * 4, (y * w + x) * 4 + 3)
    expect(inkBBox(d, w, h)).toEqual({ x: 5, y: 3, w: 7, h: 3 })
  })
  it('null on blank page', () => {
    expect(inkBBox(new Uint8ClampedArray(16 * 4).fill(255), 4, 4)).toBeNull()
  })
})

describe('faceCrop', () => {
  it('centres on the head, keeps the aspect ratio and stays inside the image', async () => {
    const { faceCrop } = await import('./resize')
    const r = faceCrop(1000, 1500, { x: 400, y: 500, width: 200, height: 200 }, 200 / 230, 1.5, 0.65)
    expect(r.h).toBeCloseTo((200 * 1.5) / 0.65, -1)
    expect(Math.abs(r.w / r.h - 200 / 230)).toBeLessThan(0.01)
    expect(r.x).toBeGreaterThanOrEqual(0)
    expect(r.y + r.h).toBeLessThanOrEqual(1500)
    const edge = faceCrop(1000, 1500, { x: 0, y: 0, width: 200, height: 200 }, 200 / 230, 1.5, 0.65)
    expect(edge.x).toBe(0); expect(edge.y).toBe(0)
  })
})
