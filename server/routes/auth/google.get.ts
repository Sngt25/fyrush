import { eq, or } from 'drizzle-orm'
import { sendRedirect } from 'h3'
import { USER_ROLE, type UserRole } from '#shared/fyrush'
import { db, schema } from 'hub:db'
import { normalizeEmail, toAuthUser, createSession } from '../../utils/auth'

function parseBfpEmails(bfpEmail: string | undefined) {
  if (!bfpEmail)
    return []

  return bfpEmail
    .split(',')
    .map(value => normalizeEmail(value))
    .filter(Boolean)
}

function pickRole(email: string, bfpEmail: string | undefined): UserRole {
  const bfpEmails = parseBfpEmails(bfpEmail)

  if (!bfpEmails.length)
    return USER_ROLE.CITIZEN

  return bfpEmails.includes(email) ? USER_ROLE.BFP : USER_ROLE.CITIZEN
}

function nextPathForRole(role: UserRole, profileComplete: boolean) {
  if (!profileComplete)
    return '/citizen/profile'

  return role === USER_ROLE.BFP ? '/bfp/dashboard' : '/citizen/report'
}

export default defineOAuthGoogleEventHandler({
  config: {
    authorizationParams: {
      prompt: 'select_account'
    }
  },
  async onSuccess(event, { user }) {
    const email = normalizeEmail(String(user.email || ''))
    const googleId = String(user.sub || '')

    if (!email || !googleId) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Google OAuth response is missing identity claims.'
      })
    }

    const config = useRuntimeConfig(event)
    const now = Date.now()

    const row = await db.query.users.findFirst({
      where: or(eq(schema.users.googleId, googleId), eq(schema.users.email, email))
    })

    const role = row?.role === USER_ROLE.POINT_PERSON
      ? USER_ROLE.POINT_PERSON
      : pickRole(email, config.bfpEmail)

    if (!row) {
      await db.insert(schema.users).values({
        id: globalThis.crypto.randomUUID(),
        role,
        loginId: null,
        name: String(user.name || email.split('@')[0] || 'User'),
        email,
        googleId,
        authProvider: 'google',
        mobile: null,
        address: null,
        profileComplete: 0,
        profileCompletedAt: null,
        registeredLat: null,
        registeredLng: null,
        createdAt: now
      })
    } else {
      const profileComplete = Boolean(row.mobile?.trim() && row.address?.trim())

      await db
        .update(schema.users)
        .set({
          role,
          email,
          googleId,
          authProvider: 'google',
          name: String(user.name || row.name || email.split('@')[0] || 'User'),
          profileComplete: profileComplete ? 1 : 0
        })
        .where(eq(schema.users.id, row.id))
    }

    const updated = await db.query.users.findFirst({
      where: eq(schema.users.googleId, googleId)
    })

    if (!updated) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Unable to finalize Google login.'
      })
    }

    const authUser = toAuthUser(updated)
    await createSession(event, authUser)

    return sendRedirect(event, nextPathForRole(authUser.role, authUser.profileComplete))
  },
  onError(event, error) {
    console.error('Google OAuth error:', error)

    const reason = error instanceof Error
      ? error.message
      : 'Unknown error'

    const params = new URLSearchParams({
      error: 'google_oauth_failed',
      reason
    })

    return sendRedirect(event, `/auth?${params.toString()}`)
  }
})
