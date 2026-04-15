import type { IncidentFeedItem } from '#shared/fyrush'

export function useIncidentPwaNotifications() {
  const knownIncidentIds = ref(new Set<string>())

  function rememberIncidents(incidents: Array<Pick<IncidentFeedItem, 'id'>>) {
    for (const incident of incidents)
      knownIncidentIds.value.add(incident.id)
  }

  async function notifyNewIncidents(incidents: IncidentFeedItem[]) {
    const newIncidents = incidents.filter(incident => !knownIncidentIds.value.has(incident.id))
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
    } catch {
      // Ignore notification failures when service worker is unavailable.
    }
  }

  return {
    rememberIncidents,
    notifyNewIncidents
  }
}
