import { createError, deleteCookie, getCookie, setCookie, type H3Event } from 'h3'
import { and, eq } from 'drizzle-orm'
import type { AuthUser, UserRole } from '#shared/fyrush'
import { USER_ROLE } from '#shared/fyrush'
import { db, schema } from 'hub:db'
import { kv } from 'hub:kv'

const SESSION_COOKIE = 'fyrush_session'
const SESSION_PREFIX = 'session:'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7
const SESSION_TTL_MS = SESSION_TTL_SECONDS * 1000
const DEFAULT_BFP_LOGIN_ID = 'KALIPAY-BFP-01'
const DEFAULT_BFP_PASSWORD = 'bfp12345'

interface SessionRecord {
  userId: string
  role: UserRole
  createdAt: number
  expiresAt: number
}

function randomId() {
  return globalThis.crypto.randomUUID()
}

async function hashPassword(raw: string) {
  const bytes = new TextEncoder().encode(raw)
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)

  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

function getSessionStorage() {
  return useStorage<SessionRecord>('auth:sessions')
}

async function writeSession(key: string, session: SessionRecord) {
  try {
    await kv.set(key, session, { ttl: SESSION_TTL_SECONDS })
    return
  } catch {
    // Fallback for environments without a KV binding.
  }

  await getSessionStorage().setItem(key, session)
}

async function readSession(key: string) {
  try {
    const value = await kv.get<SessionRecord>(key)
    if (value)
      return value
  } catch {
    // Fallback below.
  }

  return await getSessionStorage().getItem(key)
}

async function removeSession(key: string) {
  try {
    await kv.del(key)
  } catch {
    // Fallback below.
  }

  await getSessionStorage().removeItem(key)
}

function mapUser(row: typeof schema.users.$inferSelect): AuthUser {
  const profileComplete = Boolean(row.profileComplete && row.mobile?.trim() && row.address?.trim())

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

export async function verifyPassword(raw: string, passwordHash: string) {
  return await hashPassword(raw) === passwordHash
}

export async function createPasswordHash(raw: string) {
  return await hashPassword(raw)
}

export async function ensureBfpUser() {
  const bfpUser = await db.query.users.findFirst({
    where: eq(schema.users.role, USER_ROLE.BFP)
  })

  if (bfpUser)
    return bfpUser

  const now = Date.now()
  const id = randomId()
  const payload: typeof schema.users.$inferInsert = {
    id,
    role: USER_ROLE.BFP,
    loginId: DEFAULT_BFP_LOGIN_ID,
    name: 'Barangay Kalipay Fire Station',
    email: null,
    mobile: null,
    address: 'Barangay Kalipay Station',
    registeredLat: null,
    registeredLng: null,
    passwordHash: await createPasswordHash(DEFAULT_BFP_PASSWORD),
    createdAt: now
  }

  await db.insert(schema.users).values(payload)
  return payload
}

export async function createSession(event: H3Event, user: AuthUser) {
  const token = randomId()
  const now = Date.now()
  const session: SessionRecord = {
    userId: user.id,
    role: user.role,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS
  }

  await writeSession(`${SESSION_PREFIX}${token}`, session)
  setCookie(event, SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: !import.meta.dev,
    maxAge: SESSION_TTL_SECONDS
  })
}

export async function clearAuthSession(event: H3Event) {
  const token = getCookie(event, SESSION_COOKIE)
  if (token)
    await removeSession(`${SESSION_PREFIX}${token}`)

  deleteCookie(event, SESSION_COOKIE, { path: '/' })
}

export async function getCurrentUser(event: H3Event): Promise<AuthUser | null> {
  const token = getCookie(event, SESSION_COOKIE)
  if (!token)
    return null

  const session = await readSession(`${SESSION_PREFIX}${token}`)
  if (!session)
    return null

  if (session.expiresAt <= Date.now()) {
    await removeSession(`${SESSION_PREFIX}${token}`)
    deleteCookie(event, SESSION_COOKIE, { path: '/' })
    return null
  }

  const row = await db.query.users.findFirst({
    where: and(eq(schema.users.id, session.userId), eq(schema.users.role, session.role))
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

export const defaultBfpCredentials = {
  loginId: DEFAULT_BFP_LOGIN_ID,
  password: DEFAULT_BFP_PASSWORD
}
