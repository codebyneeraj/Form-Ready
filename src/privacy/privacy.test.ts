import { expect, it } from 'vitest'
import { manualBox } from './mask'

it('manualBox normalizes drag direction', () => {
  expect(manualBox({ x: 50, y: 40 }, { x: 10, y: 10 })).toEqual({ x: 10, y: 10, w: 40, h: 30 })
})
