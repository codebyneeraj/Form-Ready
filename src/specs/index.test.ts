import { describe, expect, it } from 'vitest'
import { getSpec, specs } from './index'

describe('specs', () => {
  it('has 4 unique, flagged sample packs', () => {
    expect(new Set(specs.map((s) => s.portal)).size).toBe(4)
    expect(specs.every((s) => s.sample && s.verifiedOn === '[date]')).toBe(true)
  })
  it('getSpec', () => {
    expect(getSpec('bank-clerk')?.id.maxKB).toBe(150)
    expect(getSpec('nope')).toBeUndefined()
  })
})
