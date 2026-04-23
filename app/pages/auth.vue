<script setup lang="ts">
const route = useRoute()

function continueWithGoogle() {
  if (import.meta.client)
    window.location.assign('/auth/google')
}

const oauthErrorMessage = computed(() => {
  if (route.query.error === 'google_oauth_failed') {
    const reason = typeof route.query.reason === 'string' ? route.query.reason : ''

    if (reason)
      return `Google sign-in failed: ${reason}`

    return 'Google sign-in failed. Please try again.'
  }

  return null
})
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
            v-if="oauthErrorMessage"
            color="error"
            variant="subtle"
            icon="i-lucide-triangle-alert"
            :description="oauthErrorMessage"
          />

          <UAlert
            color="neutral"
            variant="subtle"
            icon="i-lucide-shield-check"
            title="Before you continue"
            description="Use the Google account you want linked to your citizen or BFP profile."
          />

          <div class="flex justify-center">
            <UButton
              icon="i-simple-icons-google"
              color="neutral"
              variant="solid"
              size="lg"
              block
              @click="continueWithGoogle"
            >
              Continue with Google
            </UButton>
          </div>

          <p class="text-xs text-muted text-center">
            Having trouble? Make sure pop-ups are allowed and try refreshing the page.
          </p>
        </div>
      </UCard>
    </UContainer>
  </div>
</template>
