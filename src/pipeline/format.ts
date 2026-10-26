import type { CheckResult } from '../checks/types'
import type { Measured } from './types'

export function sniff(b: Uint8Array): Measured['format'] {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg'
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png'
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'pdf'
  return 'unknown'
}

const byExt = (name: string): Measured['format'] => {
  const e = name.split('.').pop()?.toLowerCase()
  return e === 'jpg' || e === 'jpeg' ? 'jpeg' : e === 'png' ? 'png' : e === 'pdf' ? 'pdf' : 'unknown'
}

export function formatCheck(name: string, bytes: Uint8Array): CheckResult {
  const claimed = byExt(name), real = sniff(bytes)
  if (claimed === 'unknown' || claimed === real) return { id: 'format.true', status: 'pass', message: 'File type matches its extension.' }
  return {
    id: 'format.true',
    status: 'warn',
    message: `This file is named .${name.split('.').pop()} but is really a ${real.toUpperCase()}. Portals often reject that.`,
    tip: 'We saved a real JPEG for you, so it is fixed in the download.',
  }
}
