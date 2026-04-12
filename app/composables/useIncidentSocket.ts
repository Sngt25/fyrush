import type { IncidentFeedItem } from '#shared/fyrush'

interface SocketPayload {
  incidents: IncidentFeedItem[]
  responder: Array<{ incidentId: string, latitude: number, longitude: number, updatedAt: number }>
  ts: number
}

export function useIncidentSocket() {
  const connected = useState('fyrush-ws-connected', () => false)
  const payload = useState<SocketPayload | null>('fyrush-ws-payload', () => null)

  let ws: WebSocket | null = null

  function connect() {
    if (!import.meta.client)
      return

    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING))
      return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    ws = new WebSocket(`${protocol}//${window.location.host}/ws/incidents`)

    ws.onopen = () => {
      connected.value = true
    }

    ws.onmessage = (event) => {
      try {
        payload.value = JSON.parse(String(event.data)) as SocketPayload
      } catch {
        // Ignore malformed packets.
      }
    }

    ws.onclose = () => {
      connected.value = false
      ws = null
      setTimeout(connect, 1200)
    }
  }

  function disconnect() {
    if (!ws)
      return

    ws.close()
    ws = null
  }

  return {
    connected,
    payload,
    connect,
    disconnect
  }
}
