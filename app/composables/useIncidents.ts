import type { IncidentFeedItem } from '#shared/fyrush'

interface IncidentResponse extends IncidentFeedItem {
  reportingUsers?: Array<{ userId: string, userName: string, userRole?: string }>
  hasManualPinnedReport?: boolean
  manualPinnedReportCount?: number
}

export function useIncidents() {
  const incidents = useState<IncidentResponse[]>('fyrush-incidents', () => [])
  const history = useState<Array<{ id: string, address: string, status: string, reportCount: number, createdAt: number }>>('fyrush-history', () => [])

  async function fetchIncidents() {
    const response = await $fetch<{ ok: boolean, incidents: IncidentResponse[] }>('/api/incidents')
    incidents.value = response.incidents
    return response.incidents
  }

  async function fetchHistory() {
    const response = await $fetch<{ ok: boolean, history: Array<{ id: string, address: string, status: string, reportCount: number, createdAt: number }> }>('/api/incidents/history')
    history.value = response.history
    return response.history
  }

  async function reportIncident(payload: { useRegistered: boolean, latitude?: number, longitude?: number, address?: string }) {
    const response = await $fetch<{ ok: boolean, incident: IncidentResponse | null, alreadyReported: boolean }>('/api/incidents/report', {
      method: 'POST',
      body: payload
    })

    await fetchIncidents()
    return response
  }

  async function updateIncidentStatus(incidentId: string, action: 'validate' | 'invalidate' | 'start_timer' | 'dispatch' | 'complete') {
    await $fetch(`/api/incidents/${incidentId}/status`, {
      method: 'POST',
      body: { action }
    })

    await fetchIncidents()
  }

  async function updateResponderLocation(incidentId: string, latitude: number, longitude: number) {
    await $fetch(`/api/incidents/${incidentId}/responder-location`, {
      method: 'POST',
      body: { latitude, longitude }
    })
  }

  return {
    incidents,
    history,
    fetchIncidents,
    fetchHistory,
    reportIncident,
    updateIncidentStatus,
    updateResponderLocation
  }
}
