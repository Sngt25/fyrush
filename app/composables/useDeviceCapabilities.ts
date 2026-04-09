interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed', platform: string }>
}

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

export function useDeviceCapabilities() {
  const canInstall = ref(false)
  const installStatus = ref('Checking install availability...')
  const canVibrate = ref(false)
  const notificationPermission = ref<'default' | 'denied' | 'granted'>('default')
  const geoStatus = ref('Location not requested yet.')
  const authStatus = ref('Biometric status not checked yet.')
  const actionStatus = ref('Ready.')

  const latitude = ref<number | null>(null)
  const longitude = ref<number | null>(null)

  const installPrompt = ref<BeforeInstallPromptEvent | null>(null)
  const storedCredentialId = ref<string | null>(null)

  const { $pwa } = useNuxtApp()

  const isStandalone = computed(() => {
    if (!import.meta.client)
      return false

    return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
  })

  const webAuthnSupported = computed(() => {
    if (!import.meta.client)
      return false

    return Boolean(window.PublicKeyCredential && navigator.credentials)
  })

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

  function refreshInstallState() {
    if (isStandalone.value) {
      canInstall.value = false
      installStatus.value = 'App is already installed (standalone mode).'
      return
    }

    if ($pwa?.isPWAInstalled) {
      canInstall.value = false
      installStatus.value = 'App is already installed.'
      return
    }

    if ($pwa?.showInstallPrompt) {
      canInstall.value = true
      installStatus.value = 'Install prompt is ready.'
      return
    }

    if (installPrompt.value) {
      canInstall.value = true
      installStatus.value = 'Install prompt is ready.'
      return
    }

    canInstall.value = false
    installStatus.value = 'Install prompt is unavailable in this browser/session. This is expected on iOS Safari and after prompt dismissal.'
  }

  async function triggerInstall() {
    if (isStandalone.value || $pwa?.isPWAInstalled) {
      actionStatus.value = 'App is already installed.'
      refreshInstallState()
      return
    }

    if ($pwa?.showInstallPrompt) {
      try {
        await $pwa.install()
        actionStatus.value = 'Install flow opened.'
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        actionStatus.value = `Install failed: ${message}`
      }

      refreshInstallState()
      return
    }

    if (!installPrompt.value) {
      actionStatus.value = 'Install prompt not available in this browser/session.'
      refreshInstallState()
      return
    }

    await installPrompt.value.prompt()
    const choice = await installPrompt.value.userChoice
    actionStatus.value = choice.outcome === 'accepted' ? 'App install accepted.' : 'App install dismissed.'
    installPrompt.value = null
    refreshInstallState()
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
      refreshInstallState()
    })

    window.addEventListener('appinstalled', () => {
      actionStatus.value = 'App installed successfully.'
      refreshInstallState()
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

    watch(
      () => [$pwa?.showInstallPrompt, $pwa?.isPWAInstalled],
      () => {
        refreshInstallState()
      },
      { immediate: true }
    )

    refreshInstallState()
  })

  return {
    canInstall,
    installStatus,
    canVibrate,
    notificationPermission,
    geoStatus,
    authStatus,
    actionStatus,
    latitude,
    longitude,
    triggerInstall,
    requestNotifications,
    registerPasskey,
    authenticateWithPasskey,
    clearPasskey,
    vibrateDevice,
    requestLocation
  }
}
