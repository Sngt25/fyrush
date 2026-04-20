import type { IncidentFeedItem } from '#shared/fyrush'

const FIRE_ALERT_VIBRATION_PATTERN = [3000, 300, 3000, 300, 3000, 300, 3000, 300, 3000]

export function useIncidentPwaNotifications() {
  const knownIncidentIds = useState<string[]>('fyrush-known-incident-ids', () => [])

  function getKnownIncidentSet() {
    return new Set(knownIncidentIds.value)
  }

  function commitKnownIncidentSet(set: Set<string>) {
    knownIncidentIds.value = Array.from(set)
  }

  function rememberIncidents(incidents: Array<Pick<IncidentFeedItem, 'id'>>) {
    const knownSet = getKnownIncidentSet()

    for (const incident of incidents)
      knownSet.add(incident.id)

    commitKnownIncidentSet(knownSet)
  }

  async function notifyNewIncidents(incidents: IncidentFeedItem[]) {
    const knownSet = getKnownIncidentSet()
    const newIncidents = incidents.filter(incident => !knownSet.has(incident.id))
    rememberIncidents(incidents)

    if (!import.meta.client || newIncidents.length === 0)
      return

    if (!('Notification' in window) || Notification.permission !== 'granted')
      return

    try {
      const registration = await navigator.serviceWorker.ready

      for (const incident of newIncidents) {
        await registration.showNotification('Fyrush Fire Alert', {
          body: `New report: ${incident.address}`,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: `incident-${incident.id}`
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
