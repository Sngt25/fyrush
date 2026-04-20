import { BARANGAY_KALIPAY_CENTER, USER_ROLE } from '#shared/fyrush'
import { requireCompleteUser } from '../../utils/auth'
import { createIncidentReport } from '../../utils/incidents'
import { sendIncidentPushToOtherUsers } from '../../utils/push'

export default defineEventHandler(async (event) => {
  const user = await requireCompleteUser(event, [USER_ROLE.CITIZEN, USER_ROLE.POINT_PERSON])

  const body = await readBody<{
    useRegistered?: boolean
    latitude?: number
    longitude?: number
    address?: string
  }>(event)

  const useRegistered = body.useRegistered !== false
  const latitude = useRegistered ? BARANGAY_KALIPAY_CENTER.lat : body.latitude
  const longitude = useRegistered ? BARANGAY_KALIPAY_CENTER.lng : body.longitude

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Location is required. Confirm your registered location or pin manually on map.'
    })
  }

  const address = body.address?.trim() || (useRegistered ? 'Barangay Kalipay set location' : 'Pinned fire location') || 'Unknown location'

  const result = await createIncidentReport({
    userId: user.id,
    latitude,
    longitude,
    address,
    source: useRegistered ? 'registered' : 'manual',
    autoValidate: user.role === USER_ROLE.POINT_PERSON
  })

  if (!result.alreadyReported)
    await sendIncidentPushToOtherUsers(result.incident, user.id)

  return {
    ok: true,
    incident: result.incident,
    alreadyReported: result.alreadyReported
  }
})
