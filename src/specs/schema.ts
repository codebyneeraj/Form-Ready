export type Format = 'jpeg' | 'pdf'

export type FaceRule = { count: 1; minHeightRatio: number; maxHeightRatio: number }

export type FileRule = {
  px?: [number, number]
  kb?: [number, number]
  maxKB?: number
  format: Format
  background?: 'white'
  face?: FaceRule
}

export type SpecPack = {
  portal: string
  displayName: string
  sample?: boolean // true = placeholder numbers, not from an official notice
  badge?: { text: string; color: string } // fallback tile when there is no logo
  logo?: string // e.g. '/logos/ssc.png' placed in public/logos by the team
  source: string
  verifiedOn: string
  photo: FileRule
  signature: FileRule
  id: FileRule
}

export type Kind = 'photo' | 'signature' | 'id'
