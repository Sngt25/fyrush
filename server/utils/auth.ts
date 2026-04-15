import { createHash, randomUUID } from 'node:crypto'
import { createError, deleteCookie, getCookie, setCookie, type H3Event } from 'h3'
import { and, eq } from 'drizzle-orm'
import type { AuthUser, UserRole } from '#shared/fyrush'
import { USER_ROLE } from '#shared/fyrush'
import { db, schema } from 'hub:db'
import { kv } from 'hub:kv'

const SESSION_COOKIE = 'fyrush_session'
const SESSION_PREFIX = 'session:'
const DEFAULT_BFP_LOGIN_ID = 'KALIPAY-BFP-01'
const DEFAULT_BFP_PASSWORD = 'bfp12345'

interface SessionRecord {
  userId: string
  role: UserRole
  createdAt: number
}

function hashPassword(raw: string) {
  return createHash('sha256').update(raw).digest('hex')
}

function mapUser(row: typeof schema.users.$inferSelect): AuthUser {
  return {
    id: row.id,
    role: row.role as UserRole,
    name: row.name,
    email: row.email,
    mobile: row.mobile,
    registeredLat: row.registeredLat,
    registeredLng: row.registeredLng
  }
}

export function verifyPassword(raw: string, passwordHash: string) {
  return hashPassword(raw) === passwordHash
}

export function createPasswordHash(raw: string) {
  return hashPassword(raw)
}

export async function ensureBfpUser() {
  const bfpUser = await db.query.users.findFirst({
    where: eq(schema.users.role, USER_ROLE.BFP)
  })

  if (bfpUser)
    return bfpUser

  const now = Date.now()
  const id = randomUUID()
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
    passwordHash: createPasswordHash(DEFAULT_BFP_PASSWORD),
    createdAt: now
  }

  await db.insert(schema.users).values(payload)
  return payload
}

export async function createSession(event: H3Event, user: AuthUser) {
  const token = randomUUID()
  const session: SessionRecord = {
    userId: user.id,
    role: user.role,
    createdAt: Date.now()
  }

  await kv.set(`${SESSION_PREFIX}${token}`, session, { ttl: 60 * 60 * 24 * 7 })
  setCookie(event, SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7
  })
}

export async function clearAuthSession(event: H3Event) {
  const token = getCookie(event, SESSION_COOKIE)
  if (token)
    await kv.del(`${SESSION_PREFIX}${token}`)

  deleteCookie(event, SESSION_COOKIE, { path: '/' })
}

export async function getCurrentUser(event: H3Event): Promise<AuthUser | null> {
  const token = getCookie(event, SESSION_COOKIE)
  if (!token)
    return null

  const session = await kv.get<SessionRecord>(`${SESSION_PREFIX}${token}`)
  if (!session)
    return null

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

export function toAuthUser(row: typeof schema.users.$inferSelect): AuthUser {
  return mapUser(row)
}

export const defaultBfpCredentials = {
  loginId: DEFAULT_BFP_LOGIN_ID,
  password: DEFAULT_BFP_PASSWORD
}
