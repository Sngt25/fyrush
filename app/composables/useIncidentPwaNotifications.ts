import type { IncidentFeedItem } from '#shared/fyrush'
import { INCIDENT_STATUS } from '#shared/fyrush'

const FIRE_ALERT_VIBRATION_PATTERN = [3000, 300, 3000, 300, 3000, 300, 3000, 300, 3000]
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

    if (!('Notification' in window) || Notification.permission !== 'granted')
      return

    try {
      const registration = await navigator.serviceWorker.ready

      for (const entry of activityIncidents) {
        const notificationTitle = entry.isNew ? 'Fyrush Fire Alert' : 'Fyrush Fire Update'
        const notificationBody = entry.isNew
          ? `New report: ${entry.incident.address}`
          : `Incident updated: ${entry.incident.address}`

        await registration.showNotification(notificationTitle, {
          body: notificationBody,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: `incident-${entry.incident.id}`
        })
      }

      if ('vibrate' in navigator)
        navigator.vibrate(FIRE_ALERT_VIBRATION_PATTERN)
    } catch {
      // Ignore notification failures when service worker is unavailable.
    }
  }

  return {
    rememberIncidents,
    notifyNewIncidents
  }
}
