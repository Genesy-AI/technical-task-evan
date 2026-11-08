import { FC } from 'react'
import { LeadsGetManyOutput } from '../api/types/leads/getMany'

type Lead = LeadsGetManyOutput[number]

const PROVIDER_NAMES: Record<NonNullable<Lead['phoneEnrichmentProvider']>, string> = {
  orionConnect: 'Orion Connect',
  astraDialer: 'Astra Dialer',
  nimbusLookup: 'Nimbus Lookup',
}

export const PhoneEnrichmentCell: FC<{ lead: Lead }> = ({ lead }) => {
  const providerName = lead.phoneEnrichmentProvider ? PROVIDER_NAMES[lead.phoneEnrichmentProvider] : null

  if (lead.phoneEnrichmentStatus === 'IN_PROGRESS') {
    return (
      <div className="flex items-center text-sm text-blue-700">
        <svg className="animate-spin mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        {providerName ? `Checking ${providerName}...` : 'Starting...'}
      </div>
    )
  }

  if (lead.phoneNumber) {
    return (
      <div className="text-sm text-gray-900" title={providerName ? `Found via ${providerName}` : undefined}>
        {lead.phoneNumber}
      </div>
    )
  }

  if (lead.phoneEnrichmentStatus === 'NOT_FOUND') {
    return <div className="text-sm text-gray-400">No data found</div>
  }

  if (lead.phoneEnrichmentStatus === 'FAILED') {
    return <div className="text-sm text-red-600">Failed</div>
  }

  return <div className="text-sm text-gray-900">-</div>
}
