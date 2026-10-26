export type CheckResult = {
  id: string // "face.count"
  status: 'pass' | 'warn' | 'fail'
  message: string
  tip?: string
}
