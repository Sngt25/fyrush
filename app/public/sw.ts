/// <reference lib="webworker" />

import { precacheAndRoute } from 'workbox-precaching'
import type { PrecacheEntry } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope

declare global {
  interface ServiceWorkerGlobalScope {
    __WB_MANIFEST: Array<string | PrecacheEntry>
  }
}

precacheAndRoute(self.__WB_MANIFEST)

const INCIDENT_SIGNATURE_CACHE = 'fyrush-notification-state-v1'
const INCIDENT_SIGNATURES_KEY = '/__notification-state__/incident-signatures'
const PUSH_VIBRATION_PATTERN = [300, 120, 300, 120, 300]

interface NotificationIncidentSummary {
  id: string
  address?: string
  status?: string
  updatedAt?: number
  reportCount?: number
}

interface StoredIncidentState {
  signatures: Record<string, string>
}

interface IncidentChange {
  incident: NotificationIncidentSummary
  kind: 'new' | 'updated'
}

function toIncidentSignature(incident: NotificationIncidentSummary) {
  return `${incident.updatedAt || 0}:${incident.reportCount || 0}:${incident.status || 'unknown'}`
}

function buildNotificationMessage(change: IncidentChange) {
  const address = change.incident.address || 'Unknown location'

  if (change.kind === 'new') {
    return {
      title: 'Fyrush Fire Alert',
      body: `New report: ${address}`
    }
  }

  if (change.incident.status === 'completed') {
    return {
      title: 'Fyrush Fire Update',
      body: `Report completed: ${address}`
    }
  }

  if (change.incident.status === 'invalidated') {
    return {
      title: 'Fyrush Fire Update',
      body: `Report invalidated: ${address}`
    }
  }

  if (change.incident.status === 'validated') {
    return {
      title: 'Fyrush Fire Update',
      body: `Report validated: ${address}`
    }
  }

  if (change.incident.status === 'on_the_way') {
    return {
      title: 'Fyrush Fire Update',
      body: `Responders dispatched: ${address}`
    }
  }

  return {
    title: 'Fyrush Fire Update',
    body: `Report updated: ${address}`
  }
}

async function readIncidentState() {
  const cache = await caches.open(INCIDENT_SIGNATURE_CACHE)
  const response = await cache.match(INCIDENT_SIGNATURES_KEY)

  if (!response)
    return { signatures: {} } as StoredIncidentState

  try {
    const parsed = await response.json() as StoredIncidentState
    if (!parsed || typeof parsed !== 'object' || !parsed.signatures || typeof parsed.signatures !== 'object')
      return { signatures: {} } as StoredIncidentState

    return parsed
  } catch {
    return { signatures: {} } as StoredIncidentState
  }
}

async function writeIncidentState(state: StoredIncidentState) {
  const cache = await caches.open(INCIDENT_SIGNATURE_CACHE)
  await cache.put(INCIDENT_SIGNATURES_KEY, new Response(JSON.stringify(state), {
    headers: {
      'content-type': 'application/json'
    }
  }))
}

async function fetchIncidentNotificationSummary() {
  try {
    const response = await fetch('/api/incidents/notifications', {
      credentials: 'include',
      cache: 'no-store'
    })

    if (!response.ok)
      return null

    const payload = await response.json() as { incidents?: NotificationIncidentSummary[] }
    const incidents = Array.isArray(payload.incidents) ? payload.incidents : []
    if (incidents.length === 0)
      return null

    const previousState = await readIncidentState()
    const nextSignatures: Record<string, string> = {}
    const changes: IncidentChange[] = []

    for (const incident of incidents) {
      const nextSignature = toIncidentSignature(incident)
      nextSignatures[incident.id] = nextSignature

      const previousSignature = previousState.signatures[incident.id]
      if (!previousSignature) {
        changes.push({ incident, kind: 'new' })
        continue
      }

      if (previousSignature !== nextSignature)
        changes.push({ incident, kind: 'updated' })
    }

    await writeIncidentState({ signatures: nextSignatures })

    if (changes.length === 0)
      return null

    const latestChange = changes.sort((a, b) => (b.incident.updatedAt || 0) - (a.incident.updatedAt || 0))[0]
    if (!latestChange)
      return null

    return {
      ...buildNotificationMessage(latestChange),
      incidentId: latestChange.incident.id
    }
  } catch {
    return null
  }
}

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    const summary = await fetchIncidentNotificationSummary()

    const notificationOptions: NotificationOptions & { vibrate?: number[] } = {
      body: summary?.body || 'Open Fyrush for the latest incident details.',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: summary?.incidentId ? `incident-${summary.incidentId}` : 'fyrush-fire-alert',
      vibrate: PUSH_VIBRATION_PATTERN
    }

    await self.registration.showNotification(summary?.title || 'Fyrush Fire Alert', {
      ...notificationOptions
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
