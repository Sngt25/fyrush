import { SignJWT, importPKCS8 } from 'jose'
import { and, eq, ne } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { INCIDENT_STATUS } from '#shared/fyrush'

interface PushConfig {
  publicKey: string
  privateKey: string
  subject: string
}

function getPushConfig(): PushConfig | null {
  const config = useRuntimeConfig()

  const publicKey = config.public.webPushPublicKey?.trim()
  const privateKey = config.webPushPrivateKey?.trim()
  const subject = config.webPushSubject?.trim()

  if (!publicKey || !privateKey || !subject)
    return null

  return {
    publicKey,
    privateKey,
    subject
  }
}

function getAudience(endpoint: string) {
  const url = new URL(endpoint)
  return `${url.protocol}//${url.host}`
}

async function createVapidJwt(endpoint: string, config: PushConfig) {
  const privateKey = await importPKCS8(config.privateKey, 'ES256')
  const nowInSeconds = Math.floor(Date.now() / 1000)

  return await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', typ: 'JWT' })
    .setAudience(getAudience(endpoint))
    .setSubject(config.subject)
    .setIssuedAt(nowInSeconds)
    .setExpirationTime(nowInSeconds + 12 * 60 * 60)
    .sign(privateKey)
}

async function sendSubscriptionPushWithVapidHeader(endpoint: string, config: PushConfig) {
  const jwt = await createVapidJwt(endpoint, config)

  return await fetch(endpoint, {
    method: 'POST',
    headers: {
      // RFC 8292 header format required by modern push services (notably mobile Safari/APNs).
      Authorization: `vapid t=${jwt}, k=${config.publicKey}`,
      TTL: '120',
      Urgency: 'high'
    }
  })
}

async function sendSubscriptionPushWithLegacyHeader(endpoint: string, config: PushConfig) {
  const jwt = await createVapidJwt(endpoint, config)

  return await fetch(endpoint, {
    method: 'POST',
    headers: {
      // Legacy WebPush/Crypto-Key format kept as fallback for providers expecting the old draft format.
      'Authorization': `WebPush ${jwt}`,
      'Crypto-Key': `p256ecdsa=${config.publicKey}`,
      'TTL': '120',
      'Urgency': 'high'
    }
  })
}

async function removeSubscription(endpoint: string) {
  await db
    .delete(schema.pushSubscriptions)
    .where(eq(schema.pushSubscriptions.endpoint, endpoint))
}

function isInvalidSubscriptionResponse(statusCode: number) {
  return statusCode === 404 || statusCode === 410
}

function shouldRetryWithLegacyHeader(statusCode: number) {
  return statusCode === 400 || statusCode === 401 || statusCode === 403
}

interface NotifiableIncident {
  status: string
}

function canNotifyForIncident(incident: NotifiableIncident) {
  return incident.status !== INCIDENT_STATUS.COMPLETED && incident.status !== INCIDENT_STATUS.INVALIDATED
}

export async function sendIncidentPushToOtherUsers(incident: NotifiableIncident | null | undefined, actorUserId: string) {
  if (!incident || !canNotifyForIncident(incident))
    return

  const config = getPushConfig()
  if (!config)
    return

  const subscriptions = await db
    .select({
      endpoint: schema.pushSubscriptions.endpoint
    })
    .from(schema.pushSubscriptions)
    .innerJoin(schema.users, eq(schema.pushSubscriptions.userId, schema.users.id))
    .where(
      and(
        ne(schema.pushSubscriptions.userId, actorUserId),
        eq(schema.users.profileComplete, 1)
      )
    )

  await Promise.all(subscriptions.map(async ({ endpoint }) => {
    try {
      let response = await sendSubscriptionPushWithVapidHeader(endpoint, config)

      if (shouldRetryWithLegacyHeader(response.status))
        response = await sendSubscriptionPushWithLegacyHeader(endpoint, config)

      if (isInvalidSubscriptionResponse(response.status))
        await removeSubscription(endpoint)
    } catch {
      // Ignore transient push delivery failures.
    }
  }))
}
