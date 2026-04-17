import { deleteCookie } from 'h3'
import { clearAuthSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await clearAuthSession(event)
  deleteCookie(event, 'fyrush_user', { path: '/' })

  return {
    ok: true
  }
})
