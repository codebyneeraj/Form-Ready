import type { SpecPack } from './schema'
import central from './central-recruitment.json'
import railway from './railway-recruitment.json'
import bank from './bank-clerk.json'
import state from './state-services.json'

export const specs = [central, railway, bank, state] as SpecPack[]

export const getSpec = (portal: string) => specs.find((s) => s.portal === portal)
