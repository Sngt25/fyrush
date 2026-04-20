/// <reference lib="webworker" />

import { precacheAndRoute } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope

declare global {
  interface ServiceWorkerGlobalScope {
    __WB_MANIFEST: Array<unknown>
  }
}

precacheAndRoute(self.__WB_MANIFEST)

function isActiveIncidentStatus(status: string | undefined) {
  return status !== 'completed' && status !== 'invalidated'
}

async function fetchLatestIncidentSummary() {
  try {
    const response = await fetch('/api/incidents', {
      credentials: 'include',
      cache: 'no-store'
    })

    if (!response.ok)
      return null

    const payload = await response.json() as { incidents?: Array<{ address?: string, status?: string }> }
    const latestActiveIncident = (payload.incidents || []).find(item => isActiveIncidentStatus(item.status))

    if (!latestActiveIncident)
      return null

    return {
      title: 'Fyrush Fire Alert',
      body: `New or updated report: ${latestActiveIncident.address || 'Unknown location'}`
    }
  } catch {
    return null
  }
}

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    const summary = await fetchLatestIncidentSummary()

    await self.registration.showNotification(summary?.title || 'Fyrush Fire Alert', {
      body: summary?.body || 'Open Fyrush for the latest incident details.',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'fyrush-fire-alert'
    })
  })())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })

    for (const client of clientList) {
      const windowClient = client as WindowClient

      if ('focus' in windowClient) {
        await windowClient.focus()
        await windowClient.navigate('/citizen/report')
        return
      }
    }

    await self.clients.openWindow('/citizen/report')
  })())
})
