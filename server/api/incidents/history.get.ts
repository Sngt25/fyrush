import { USER_ROLE } from '#shared/fyrush'
import { requireUser } from '../../utils/auth'
import { listRecentCitizenHistory } from '../../utils/incidents'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, [USER_ROLE.CITIZEN, USER_ROLE.POINT_PERSON])
  const history = await listRecentCitizenHistory(user.id)

  return {
    ok: true,
    history
  }
})
