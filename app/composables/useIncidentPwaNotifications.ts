import type { IncidentFeedItem } from '#shared/fyrush'
import { INCIDENT_STATUS } from '#shared/fyrush'

const KNOWN_INCIDENT_SIGNATURES_STORAGE_KEY = 'fyrush-known-incident-signatures'

type KnownIncidentSignatures = Record<string, string>

interface IncidentActivity {
  incident: IncidentFeedItem
  isNew: boolean
}

export function useIncidentPwaNotifications() {
  const knownIncidentSignatures = useState<KnownIncidentSignatures>('fyrush-known-incident-signatures', () => ({}))
  const hasLoadedKnownIncidentSignatures = useState('fyrush-known-incident-signatures-loaded', () => false)

  function isActiveIncident(incident: IncidentFeedItem) {
    return incident.status !== INCIDENT_STATUS.COMPLETED && incident.status !== INCIDENT_STATUS.INVALIDATED
  }

  function toIncidentSignature(incident: IncidentFeedItem) {
    return `${incident.updatedAt}:${incident.reportCount}:${incident.status}`
  }

  function loadKnownIncidentSignaturesFromStorage() {
    if (!import.meta.client || hasLoadedKnownIncidentSignatures.value)
      return

    hasLoadedKnownIncidentSignatures.value = true

    try {
      const raw = localStorage.getItem(KNOWN_INCIDENT_SIGNATURES_STORAGE_KEY)
      if (!raw)
        return

      const parsed = JSON.parse(raw) as KnownIncidentSignatures
      if (parsed && typeof parsed === 'object')
        knownIncidentSignatures.value = parsed
    } catch {
      // Ignore malformed storage values.
    }
  }

  function persistKnownIncidentSignaturesToStorage() {
    if (!import.meta.client)
      return

    try {
      localStorage.setItem(KNOWN_INCIDENT_SIGNATURES_STORAGE_KEY, JSON.stringify(knownIncidentSignatures.value))
    } catch {
      // Ignore quota/storage errors.
    }
  }

  function rememberIncidents(incidents: IncidentFeedItem[]) {
    loadKnownIncidentSignaturesFromStorage()

    const nextKnownSignatures: KnownIncidentSignatures = {
      ...knownIncidentSignatures.value
    }

    for (const incident of incidents)
      nextKnownSignatures[incident.id] = toIncidentSignature(incident)

    knownIncidentSignatures.value = nextKnownSignatures
    persistKnownIncidentSignaturesToStorage()
  }

  async function notifyNewIncidents(incidents: IncidentFeedItem[]) {
    loadKnownIncidentSignaturesFromStorage()

    const previousKnownSignatures = {
      ...knownIncidentSignatures.value
    }

    const activityIncidents: IncidentActivity[] = incidents
      .filter(isActiveIncident)
      .map((incident) => {
        const previousSignature = previousKnownSignatures[incident.id]
        const nextSignature = toIncidentSignature(incident)

        if (!previousSignature)
          return { incident, isNew: true }

        if (previousSignature !== nextSignature)
          return { incident, isNew: false }

        return null
      })
      .filter((value): value is IncidentActivity => Boolean(value))

    rememberIncidents(incidents)

    if (!import.meta.client || activityIncidents.length === 0)
      return
  }

  return {
    rememberIncidents,
    notifyNewIncidents
  }
}
