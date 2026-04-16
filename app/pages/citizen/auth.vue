<script setup lang="ts">
const config = useRuntimeConfig()
const pending = ref(false)
const error = ref('')
const isGoogleReady = ref(false)
let readyTimeoutId: number | null = null
let readyPollId: number | null = null

const googleClientId = computed(() => String(config.public.googleAuth?.clientId || config.public.googleClientId || '').trim())
const hasGoogleClientId = computed(() => googleClientId.value.length > 0)

const { googleLogin } = useAuthSession()

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

onMounted(() => {
  if (!hasGoogleClientId.value) {
    error.value = 'Google Sign-In is not configured. Set NUXT_PUBLIC_GOOGLE_AUTH_CLIENT_ID (or NUXT_PUBLIC_GOOGLE_CLIENT_ID) in the deployed environment.'
    return
  }

  if (hasGoogleGisReady())
    markGoogleReady()

  window.addEventListener('nuxt-google-auth:ready', onGoogleReadyEvent)

  // Fallback polling for environments where the ready event may fire before listener attach.
  readyPollId = window.setInterval(() => {
    if (hasGoogleGisReady())
      markGoogleReady()
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
    error.value = err instanceof Error ? err.message : 'Unable to log in with Google.'
  } finally {
    pending.value = false
  }
}

function onGoogleError(err: unknown) {
  error.value = err instanceof Error ? err.message : 'Google sign-in failed.'
}
</script>

<template>
  <UContainer class="py-8 max-w-md">
    <UCard class="fyrush-panel border border-default/70 shadow-xl">
      <template #header>
        <div class="space-y-4">
          <div class="flex justify-center">
            <AppLogo class="w-44 h-auto" />
          </div>
          <div class="space-y-1 text-center">
            <h1 class="text-2xl font-black fyrush-title">
              Continue with Google
            </h1>
            <p class="text-sm text-muted">
              Sign in for citizen access. The BFP account is detected by the configured BFP_EMAIL.
            </p>
          </div>
        </div>
      </template>

      <div class="space-y-4">
        <div class="flex justify-center">
          <ClientOnly v-if="hasGoogleClientId">
            <GoogleLoginButton
              :options="{ theme: 'filled_blue', size: 'large', text: 'continue_with', shape: 'pill' }"
              @success="onGoogleSuccess"
              @error="onGoogleError"
            />
          </ClientOnly>

          <USkeleton
            v-if="hasGoogleClientId && !isGoogleReady"
            class="h-11 w-[300px] rounded-full"
          />
        </div>

        <UAlert
          color="neutral"
          variant="soft"
          icon="i-lucide-shield-check"
          title="Profile completion required"
          description="New sign-ins must provide mobile number and address before protected pages are unlocked."
        />

        <UButton
          to="/"
          variant="ghost"
          block
          :disabled="pending"
        >
          Back to Home
        </UButton>
      </div>

      <p
        v-if="error"
        class="text-sm text-error mt-3 text-center"
      >
        {{ error }}
      </p>
    </UCard>
  </UContainer>
</template>
