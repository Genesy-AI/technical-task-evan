export type LeadsEnrichPhonesInput = {
  leadIds: number[]
}

export type LeadsEnrichPhonesOutput = {
  started: number[]
  skipped: Array<{
    leadId: number
    reason: string
  }>
  errors: Array<{
    leadId: number
    leadName: string
    error: string
  }>
}
