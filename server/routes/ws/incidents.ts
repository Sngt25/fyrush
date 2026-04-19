import { desc } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { INCIDENT_STATUS } from '#shared/fyrush'

const peerTimers = new Map<string, ReturnType<typeof setInterval>>()

async function buildPayload() {
  const incidents = await db.select().from(schema.incidents).orderBy(desc(schema.incidents.updatedAt)).limit(60)
  const activeIncidentIds = new Set(
    incidents
      .filter(item => item.status !== INCIDENT_STATUS.COMPLETED && item.status !== INCIDENT_STATUS.INVALIDATED)
      .map(item => item.id)
  )

  const responder = (await db.select().from(schema.responderLocations))
    .filter(item => activeIncidentIds.has(item.incidentId))

  return JSON.stringify({ incidents, responder, ts: Date.now() })
}

export default defineWebSocketHandler({
  async open(peer) {
    peer.subscribe('incidents')
    peer.send(await buildPayload())

    const timer = setInterval(async () => {
      try {
        peer.send(await buildPayload())
      } catch {
        // Ignore send race during close.
      }
    }, 2000)

    peerTimers.set(peer.id, timer)
  },
  close(peer) {
    peer.unsubscribe('incidents')

    const timer = peerTimers.get(peer.id)
    if (timer) {
      clearInterval(timer)
      peerTimers.delete(peer.id)
    }
  }
})
