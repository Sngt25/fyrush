import { USER_ROLE } from '#shared/fyrush'
import { requireUser } from '../../utils/auth'
import { createIncidentReport } from '../../utils/incidents'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, [USER_ROLE.CITIZEN, USER_ROLE.POINT_PERSON])

  const body = await readBody<{
    useRegistered?: boolean
    latitude?: number
    longitude?: number
    address?: string
  }>(event)

  const useRegistered = body.useRegistered !== false
  const latitude = useRegistered ? user.registeredLat : body.latitude
  const longitude = useRegistered ? user.registeredLng : body.longitude

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Location is required. Confirm your registered location or pin manually on map.'
    })
  }

  const address = body.address?.trim() || (useRegistered ? user.address : 'Pinned fire location') || 'Unknown location'

  const incident = await createIncidentReport({
    userId: user.id,
    latitude,
    longitude,
    address,
    source: useRegistered ? 'registered' : 'manual'
  })

  return {
    ok: true,
    incident
  }
})
