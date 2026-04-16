import { and, eq, or } from 'drizzle-orm'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { USER_ROLE, type UserRole } from '#shared/fyrush'
import { db, schema } from 'hub:db'
import { createPasswordHash, createSession, normalizeEmail, toAuthUser } from '../../../utils/auth'

const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com']
const GOOGLE_JWKS_URL = new URL('https://www.googleapis.com/oauth2/v3/certs')
const googleJwks = createRemoteJWKSet(GOOGLE_JWKS_URL)

function isSchemaError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return /no such column|SQLITE_ERROR|column .* does not exist/i.test(message)
}

function pickRole(email: string, bfpEmail: string | undefined): UserRole {
  if (!bfpEmail)
    return USER_ROLE.CITIZEN

  return normalizeEmail(bfpEmail) === email ? USER_ROLE.BFP : USER_ROLE.CITIZEN
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ credential?: string }>(event)

  if (!body.credential) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Google credential is required.'
    })
  }

  const config = useRuntimeConfig(event)
  const audience = config.public.googleAuth?.clientId || config.public.googleClientId

  if (!audience) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Google client ID is not configured.'
    })
  }

  const { payload } = await jwtVerify(body.credential, googleJwks, {
    issuer: GOOGLE_ISSUERS,
    audience
  })

  if (!payload.email || payload.email_verified !== true || !payload.sub) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Google token is missing verified identity claims.'
    })
  }

  try {
    const email = normalizeEmail(String(payload.email))
    const googleId = String(payload.sub)
    const role = pickRole(email, config.bfpEmail)
    const now = Date.now()

    const row = await db.query.users.findFirst({
      where: or(eq(schema.users.googleId, googleId), eq(schema.users.email, email))
    })

    const profileComplete = Boolean(row?.mobile?.trim() && row?.address?.trim())

    if (!row) {
      const id = globalThis.crypto.randomUUID()

      await db.insert(schema.users).values({
        id,
        role,
        loginId: null,
        name: String(payload.name || email.split('@')[0] || 'User'),
        email,
        googleId,
        authProvider: 'google',
        mobile: null,
        address: null,
        profileComplete: 0,
        profileCompletedAt: null,
        registeredLat: null,
        registeredLng: null,
        passwordHash: await createPasswordHash(globalThis.crypto.randomUUID()),
        createdAt: now
      })
    } else {
      await db
        .update(schema.users)
        .set({
          role,
          email,
          googleId,
          authProvider: 'google',
          name: row.name || String(payload.name || email.split('@')[0] || 'User'),
          profileComplete: profileComplete ? 1 : 0
        })
        .where(and(eq(schema.users.id, row.id)))
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

    const nextPath = authUser.profileComplete
      ? authUser.role === USER_ROLE.BFP
        ? '/bfp/dashboard'
        : '/citizen/report'
      : '/citizen/profile'

    return {
      ok: true,
      user: authUser,
      nextPath
    }
  } catch (error) {
    if (isSchemaError(error)) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Database schema is outdated. Run migration 0002_google_auth_profile.sql in production.'
      })
    }

    throw error
  }
})
