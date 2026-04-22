<script setup lang="ts">
const config = useRuntimeConfig()
const pending = ref(false)
const error = ref('')
const { toMessage } = useAppError()
const isGoogleReady = ref(false)
let readyTimeoutId: number | null = null
let readyPollId: number | null = null

const googleClientId = computed(() => String(config.public.googleAuth?.clientId || config.public.googleClientId || '').trim())
const hasGoogleClientId = computed(() => googleClientId.value.length > 0)

const { googleLogin } = useAuthSession()

interface GoogleAccountsIdApi {
  disableAutoSelect?: () => void
}

function markGoogleReady() {
  isGoogleReady.value = true

  if (readyTimeoutId !== null) {
    window.clearTimeout(readyTimeoutId)
    readyTimeoutId = null
  }

  if (readyPollId !== null) {
    window.clearInterval(readyPollId)
    readyPollId = null
  }
}

function onGoogleReadyEvent() {
  markGoogleReady()
}

function hasGoogleGisReady() {
  const googleApi = (window as Window & { google?: { accounts?: { id?: unknown } } }).google
  return Boolean(googleApi?.accounts?.id)
}

function disableGoogleAutoSelect() {
  const googleApi = (window as Window & { google?: { accounts?: { id?: GoogleAccountsIdApi } } }).google
  googleApi?.accounts?.id?.disableAutoSelect?.()
}

onMounted(() => {
  if (!hasGoogleClientId.value) {
    error.value = 'Google Sign-In is not configured. Set NUXT_PUBLIC_GOOGLE_AUTH_CLIENT_ID (or NUXT_PUBLIC_GOOGLE_CLIENT_ID) in the deployed environment.'
    return
  }

  if (hasGoogleGisReady()) {
    disableGoogleAutoSelect()
    markGoogleReady()
  }

  window.addEventListener('nuxt-google-auth:ready', onGoogleReadyEvent)

  // Fallback polling for environments where the ready event may fire before listener attach.
  readyPollId = window.setInterval(() => {
    if (hasGoogleGisReady()) {
      disableGoogleAutoSelect()
      markGoogleReady()
    }
  }, 250)

  readyTimeoutId = window.setTimeout(() => {
    if (!isGoogleReady.value) {
      error.value = 'Google Sign-In is taking too long to load. Check Google OAuth authorized origins and browser blockers.'
    }
  }, 7000)
})

onBeforeUnmount(() => {
  window.removeEventListener('nuxt-google-auth:ready', onGoogleReadyEvent)

  if (readyTimeoutId !== null)
    window.clearTimeout(readyTimeoutId)

  if (readyPollId !== null)
    window.clearInterval(readyPollId)
})

async function onGoogleSuccess(payload: { credential?: string }) {
  if (!payload.credential) {
    error.value = 'Google did not return a credential. Please try again.'
    return
  }

  pending.value = true
  error.value = ''

  try {
    const result = await googleLogin(payload.credential)
    await navigateTo(result.nextPath)
  } catch (err) {
    error.value = toMessage(err, 'Unable to log in with Google.')
  } finally {
    pending.value = false
  }
}

function onGoogleError(err: unknown) {
  error.value = toMessage(err, 'Google sign-in failed.')
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center">
    <UContainer class="py-8 max-w-md">
      <UCard class="fyrush-panel border border-default/70 shadow-xl">
        <template #header>
          <div class="space-y-3">
            <div class="flex justify-center">
              <AppLogo class="w-44 h-auto" />
            </div>

            <div class="text-center space-y-1">
              <h1 class="text-lg font-semibold text-highlighted">
                Sign in to Fyrush
              </h1>
              <p class="text-sm text-muted">
                Report incidents quickly and track updates in real time.
              </p>
            </div>
          </div>
        </template>

        <div class="space-y-4">
          <UAlert
            color="neutral"
            variant="subtle"
            icon="i-lucide-shield-check"
            title="Before you continue"
            description="Use the Google account you want linked to your citizen or BFP profile."
          />

          <div class="flex justify-center">
            <ClientOnly v-if="hasGoogleClientId && isGoogleReady">
              <GoogleLoginButton
                :options="{ theme: 'filled_blue', size: 'large', text: 'continue_with', shape: 'pill', auto_select: false }"
                @success="onGoogleSuccess"
                @error="onGoogleError"
              />
            </ClientOnly>

            <USkeleton
              v-if="hasGoogleClientId && !isGoogleReady"
              class="h-11 w-75 rounded-full"
            />
          </div>

          <p class="text-xs text-muted text-center">
            Having trouble? Make sure pop-ups are allowed and try refreshing the page.
          </p>
        </div>

        <p
          v-if="error"
          class="text-sm text-error mt-3 text-center"
        >
          {{ error }}
        </p>
      </UCard>
    </UContainer>
  </div>
</template>
