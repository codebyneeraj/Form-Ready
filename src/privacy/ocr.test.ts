import { describe, expect, it } from 'vitest'
import { maskBoxes } from './ocr'

const w = (text: string, x0: number) => ({ text, bbox: { x0, y0: 10, x1: x0 + text.length * 10, y1: 30 } })

describe('maskBoxes', () => {
  it('masks first 8 of 4-4-4 groups', () => {
    const b = maskBoxes([w('Aadhaar', 0), w('1234', 100), w('5678', 150), w('9012', 200)])
    expect(b).toEqual([
      { x: 100, y: 10, w: 40, h: 20 },
      { x: 150, y: 10, w: 40, h: 20 },
    ])
  })
  it('splits a single 12-digit word', () => {
    expect(maskBoxes([w('123456789012', 0)])).toEqual([{ x: 0, y: 10, w: 80, h: 20 }])
  })
  it('ignores other digit runs', () => {
    expect(maskBoxes([w('1234', 0), w('5678', 50), w('x', 100)])).toEqual([])
  })
})
