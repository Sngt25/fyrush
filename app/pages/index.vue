<script setup lang="ts">
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed', platform: string }>
}

const canInstall = ref(false)
const canVibrate = ref(false)
const notificationPermission = ref<'default' | 'denied' | 'granted'>('default')
const geoStatus = ref('Location not requested yet.')
const authStatus = ref('Biometric status not checked yet.')
const actionStatus = ref('Ready.')

const latitude = ref<number | null>(null)
const longitude = ref<number | null>(null)

const installPrompt = ref<BeforeInstallPromptEvent | null>(null)

const webAuthnSupported = computed(() => {
  if (!import.meta.client)
    return false

  return Boolean(window.PublicKeyCredential && navigator.credentials)
})

const storedCredentialId = ref<string | null>(null)

function randomBuffer(length: number): ArrayBuffer {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes.buffer.slice(0)
}

function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''

  for (const byte of bytes)
    binary += String.fromCharCode(byte)

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(base64Url: string): ArrayBuffer {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4)
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))

  return bytes.buffer.slice(0)
}

function loadStoredPasskey() {
  const saved = localStorage.getItem('fyrush-passkey-id')
  storedCredentialId.value = saved || null
}

function saveStoredPasskey(value: string | null) {
  if (value)
    localStorage.setItem('fyrush-passkey-id', value)
  else
    localStorage.removeItem('fyrush-passkey-id')
}

async function triggerInstall() {
  if (!installPrompt.value) {
    actionStatus.value = 'Install prompt not available. Open in a supported browser and interact with the app first.'
    return
  }

  await installPrompt.value.prompt()
  const choice = await installPrompt.value.userChoice
  actionStatus.value = choice.outcome === 'accepted' ? 'App install accepted.' : 'App install dismissed.'
  canInstall.value = false
  installPrompt.value = null
}

async function requestNotifications() {
  if (!('Notification' in window)) {
    actionStatus.value = 'Notifications are not supported in this browser.'
    return
  }

  const result = await Notification.requestPermission()
  notificationPermission.value = result

  if (result !== 'granted') {
    actionStatus.value = 'Notification permission not granted.'
    return
  }

  const registration = await navigator.serviceWorker.ready
  await registration.showNotification('Fyrush PWA', {
    body: 'Notifications are enabled successfully.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png'
  })

  actionStatus.value = 'Notification sent through the service worker.'
}

async function registerPasskey() {
  if (!webAuthnSupported.value) {
    authStatus.value = 'WebAuthn is not supported in this browser.'
    return
  }

  try {
    const options: CredentialCreationOptions = {
      publicKey: {
        challenge: randomBuffer(32),
        rp: {
          name: 'Fyrush PWA',
          id: window.location.hostname
        },
        user: {
          id: randomBuffer(16),
          name: 'demo@fyrush.app',
          displayName: 'Fyrush Demo User'
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 }
        ],
        timeout: 60000,
        attestation: 'none',
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          residentKey: 'preferred',
          userVerification: 'preferred'
        }
      }
    }

    const credential = await navigator.credentials.create(options)

    if (!(credential instanceof PublicKeyCredential)) {
      authStatus.value = 'Passkey registration failed.'
      return
    }

    storedCredentialId.value = toBase64Url(credential.rawId)
    saveStoredPasskey(storedCredentialId.value)
    authStatus.value = 'Passkey registered on this device.'
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    authStatus.value = `Passkey registration failed: ${message}`
  }
}

async function authenticateWithPasskey() {
  if (!webAuthnSupported.value) {
    authStatus.value = 'WebAuthn is not supported in this browser.'
    return
  }

  if (!storedCredentialId.value) {
    authStatus.value = 'No passkey found. Register one first.'
    return
  }

  try {
    const options: CredentialRequestOptions = {
      publicKey: {
        challenge: randomBuffer(32),
        timeout: 60000,
        userVerification: 'preferred',
        allowCredentials: [
          {
            id: fromBase64Url(storedCredentialId.value),
            type: 'public-key',
            transports: ['internal']
          }
        ]
      }
    }

    const assertion = await navigator.credentials.get(options)

    if (assertion instanceof PublicKeyCredential)
      authStatus.value = 'Biometric authentication succeeded.'
    else
      authStatus.value = 'Biometric authentication failed.'
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    authStatus.value = `Biometric authentication failed: ${message}`
  }
}

function clearPasskey() {
  storedCredentialId.value = null
  saveStoredPasskey(null)
  authStatus.value = 'Saved passkey removed from local app state.'
}

function vibrateDevice() {
  if (!canVibrate.value) {
    actionStatus.value = 'Vibration API is not supported on this device.'
    return
  }

  const ok = navigator.vibrate([120, 60, 180, 60, 240])
  actionStatus.value = ok ? 'Vibration pattern triggered.' : 'Vibration request was rejected.'
}

function requestLocation() {
  if (!('geolocation' in navigator)) {
    geoStatus.value = 'Geolocation is not supported in this browser.'
    return
  }

  geoStatus.value = 'Requesting location...'
  navigator.geolocation.getCurrentPosition(
    (position) => {
      latitude.value = position.coords.latitude
      longitude.value = position.coords.longitude
      geoStatus.value = 'Location acquired.'
    },
    (error) => {
      geoStatus.value = `Location failed: ${error.message}`
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
  )
}

onMounted(async () => {
  loadStoredPasskey()
  canVibrate.value = 'vibrate' in navigator
  notificationPermission.value = 'Notification' in window ? Notification.permission : 'default'

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    installPrompt.value = event as BeforeInstallPromptEvent
    canInstall.value = true
  })

  if (webAuthnSupported.value) {
    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      authStatus.value = available
        ? 'Platform authenticator detected. You can register a passkey.'
        : 'No platform authenticator available on this device.'
    } catch {
      authStatus.value = 'Could not verify platform authenticator availability.'
    }
  } else {
    authStatus.value = 'WebAuthn is not supported in this browser.'
  }
})
</script>

<template>
  <UContainer class="py-10 space-y-8">
    <UPageHero
      title="Fyrush PWA Device Capabilities"
      description="Install the app and test notifications, biometrics (passkeys), geolocation, and vibration from one screen."
      :links="[{ label: canInstall ? 'Install app' : 'Install unavailable', icon: 'i-lucide-download', color: 'primary', disabled: !canInstall, onClick: triggerInstall }]"
    />

    <UAlert
      icon="i-lucide-info"
      title="Status"
      :description="actionStatus"
      color="neutral"
      variant="subtle"
    />

    <div class="grid gap-4 md:grid-cols-2">
      <UCard>
        <template #header>
          <h2 class="font-semibold text-lg">
            Notifications
          </h2>
        </template>

        <p class="text-sm text-muted mb-4">
          Permission: {{ notificationPermission }}
        </p>

        <UButton
          icon="i-lucide-bell"
          @click="requestNotifications"
        >
          Enable and send test notification
        </UButton>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="font-semibold text-lg">
            Vibration
          </h2>
        </template>

        <p class="text-sm text-muted mb-4">
          Supported: {{ canVibrate ? 'Yes' : 'No' }}
        </p>

        <UButton
          icon="i-lucide-sparkles"
          @click="vibrateDevice"
        >
          Trigger vibration pattern
        </UButton>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="font-semibold text-lg">
            Geolocation
          </h2>
        </template>

        <p class="text-sm text-muted mb-2">
          {{ geoStatus }}
        </p>

        <p
          v-if="latitude !== null && longitude !== null"
          class="text-sm mb-4"
        >
          Lat: {{ latitude.toFixed(6) }} | Lng: {{ longitude.toFixed(6) }}
        </p>

        <UButton
          icon="i-lucide-map-pin"
          @click="requestLocation"
        >
          Request current location
        </UButton>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="font-semibold text-lg">
            Biometrics (Passkeys)
          </h2>
        </template>

        <p class="text-sm text-muted mb-4">
          {{ authStatus }}
        </p>

        <div class="flex flex-wrap gap-2">
          <UButton
            icon="i-lucide-fingerprint"
            @click="registerPasskey"
          >
            Register passkey
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-shield-check"
            @click="authenticateWithPasskey"
          >
            Authenticate
          </UButton>
          <UButton
            color="error"
            variant="ghost"
            icon="i-lucide-trash-2"
            @click="clearPasskey"
          >
            Clear saved passkey id
          </UButton>
        </div>
      </UCard>
    </div>
  </UContainer>
</template>
