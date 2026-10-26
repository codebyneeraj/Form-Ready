import type { CheckResult } from '../checks/types'
import type { Kind, SpecPack } from '../specs/schema'

export type Measured = { width: number; height: number; bytes: number; format: 'jpeg' | 'png' | 'pdf' | 'unknown' }

export type ProcessResult = { blob: Blob; measured: Measured; checks: CheckResult[] }

// Implemented in pipeline/index.ts. Measured values come from re-decoding the output blob.
export type ProcessImage = (file: File, spec: SpecPack, kind: Kind) => Promise<ProcessResult>
