<script setup lang="ts">
const config = useRuntimeConfig()
const pending = ref(false)
const error = ref('')
const isGoogleReady = ref(false)

const googleClientId = computed(() => String(config.public.googleAuth?.clientId || config.public.googleClientId || '').trim())
const hasGoogleClientId = computed(() => googleClientId.value.length > 0)

const { googleLogin } = useAuthSession()

onMounted(() => {
  if (!hasGoogleClientId.value) {
    error.value = 'Google Sign-In is not configured. Set NUXT_PUBLIC_GOOGLE_CLIENT_ID in the deployed environment.'
    return
  }

  const readyListener = () => {
    isGoogleReady.value = true
  }

  window.addEventListener('nuxt-google-auth:ready', readyListener)

  const timeoutId = window.setTimeout(() => {
    if (!isGoogleReady.value) {
      error.value = 'Google Sign-In is taking too long to load. Check Google OAuth authorized origins and browser blockers.'
    }
  }, 7000)

  onBeforeUnmount(() => {
    window.removeEventListener('nuxt-google-auth:ready', readyListener)
    window.clearTimeout(timeoutId)
  })
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
