import { requireCompleteUser } from '../../utils/auth'
import { listIncidentFeed } from '../../utils/incidents'

export default defineEventHandler(async (event) => {
  await requireCompleteUser(event)

  const incidents = await listIncidentFeed(50)

  return {
    ok: true,
    incidents: incidents.map(item => ({
      id: item.id,
      address: item.address,
      status: item.status,
      updatedAt: item.updatedAt,
      reportCount: item.reportCount
    }))
  }
})
