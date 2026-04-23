<script setup lang="ts">
const { googleLogin } = useAuthSession()

type GoogleVerifiedPayload = {
  ok: boolean
  sub?: string
  email?: string
  name?: string
  picture?: string
}

const onVerified = async (data: GoogleVerifiedPayload) => {
  if (!data.ok)
    return

  const response = await googleLogin(data)
  await navigateTo(response.nextPath)
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
            <ClientOnly>
              <GoogleLoginButton
                :verify-on-server="true"
                :options="{ theme: 'filled_blue', size: 'large' }"
                @verified="onVerified"
              />

              <template #fallback>
                <USkeleton class="h-11 w-full" />
              </template>
            </ClientOnly>
          </div>

          <p class="text-xs text-muted text-center">
            Having trouble? Make sure pop-ups are allowed and try refreshing the page.
          </p>
        </div>
      </UCard>
    </UContainer>
  </div>
</template>
