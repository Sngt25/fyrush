import { eq, or } from 'drizzle-orm'
import { USER_ROLE, type UserRole } from '#shared/fyrush'
import { db, schema } from 'hub:db'
import { createPasswordHash, createSession, normalizeEmail, toAuthUser } from '../../../utils/auth'

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
  const body = await readBody<{
    verified?: {
      ok: boolean
      sub?: string
      email?: string
      name?: string
      picture?: string
    }
  }>(event)

  if (!body.verified?.ok || !body.verified.email || !body.verified.sub) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Google token is missing verified identity claims.'
    })
  }

  const config = useRuntimeConfig(event)
  const verified = body.verified

  try {
    const email = normalizeEmail(String(verified.email))
    const googleId = String(verified.sub)
    const name = String(verified.name || email.split('@')[0] || 'User')
    const now = Date.now()

    const row = await db.query.users.findFirst({
      where: or(eq(schema.users.googleId, googleId), eq(schema.users.email, email))
    })

    const profileComplete = Boolean(row?.mobile?.trim() && row?.address?.trim())
    const role = row?.role === USER_ROLE.POINT_PERSON
      ? USER_ROLE.POINT_PERSON
      : pickRole(email, config.bfpEmail)

    if (!row) {
      const id = globalThis.crypto.randomUUID()

      await db.insert(schema.users).values({
        id,
        role,
        loginId: null,
        name,
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
          name: String(verified.name || row.name || email.split('@')[0] || 'User'),
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
        statusMessage: 'Database schema is outdated. Run npx nuxt db generate and npx nuxt db migrate.'
      })
    }

    throw error
  }
})
