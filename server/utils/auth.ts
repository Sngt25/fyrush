import { createError, type H3Event } from 'h3'
import { and, eq } from 'drizzle-orm'
import type { AuthUser, UserRole } from '#shared/fyrush'
import { USER_ROLE } from '#shared/fyrush'

import { db, schema } from 'hub:db'

function mapUser(row: typeof schema.users.$inferSelect): AuthUser {
  const role = row.role as UserRole
  const needsRegisteredPoint = role === USER_ROLE.CITIZEN || role === USER_ROLE.POINT_PERSON
  const hasRegisteredPoint = typeof row.registeredLat === 'number' && typeof row.registeredLng === 'number'
  const profileComplete = Boolean(
    row.profileComplete
    && row.mobile?.trim()
    && row.address?.trim()
    && (!needsRegisteredPoint || hasRegisteredPoint)
  )

  return {
    id: row.id,
    role: row.role as UserRole,
    name: row.name,
    email: row.email,
    mobile: row.mobile,
    address: row.address,
    authProvider: row.authProvider === 'google' ? 'google' : 'legacy',
    profileComplete,
    registeredLat: row.registeredLat,
    registeredLng: row.registeredLng
  }
}

export async function ensureBfpUser() {
  const bfpUser = await db.query.users.findFirst({
    where: eq(schema.users.role, USER_ROLE.BFP)
  })

  if (bfpUser)
    return bfpUser

  const now = Date.now()
  const payload: typeof schema.users.$inferInsert = {
    id: globalThis.crypto.randomUUID(),
    role: USER_ROLE.BFP,
    loginId: null,
    name: 'Barangay Kalipay Fire Station',
    email: null,
    mobile: null,
    address: 'Barangay Kalipay Station',
    registeredLat: null,
    registeredLng: null,
    createdAt: now
  }

  await db.insert(schema.users).values(payload)
  return payload
}

export async function createSession(event: H3Event, user: AuthUser) {
  await setUserSession(event, {
    user: {
      id: user.id,
      role: user.role
    },
    loggedInAt: Date.now()
  }, {
    maxAge: 60 * 60 * 24 * 7
  })
}

export async function clearAuthSession(event: H3Event) {
  await clearUserSession(event)
}

export async function getCurrentUser(event: H3Event): Promise<AuthUser | null> {
  const session = await getUserSession(event)
  const sessionUser = session.user as { id?: string, role?: UserRole } | undefined

  if (!sessionUser?.id || !sessionUser.role)
    return null

  const row = await db.query.users.findFirst({
    where: and(eq(schema.users.id, sessionUser.id), eq(schema.users.role, sessionUser.role))
  })

  if (!row)
    return null

  return mapUser(row)
}

export async function requireUser(event: H3Event, allowedRoles?: UserRole[]) {
  const user = await getCurrentUser(event)

  if (!user)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  if (allowedRoles && !allowedRoles.includes(user.role))
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  return user
}

export async function requireCompleteUser(event: H3Event, allowedRoles?: UserRole[]) {
  const user = await requireUser(event, allowedRoles)

  if (!user.profileComplete) {
    throw createError({
      statusCode: 428,
      statusMessage: 'Profile is incomplete. Please add mobile number and address first.'
    })
  }

  return user
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function toAuthUser(row: typeof schema.users.$inferSelect): AuthUser {
  return mapUser(row)
}
