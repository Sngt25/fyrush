<script setup lang="ts">
const loginId = ref('KALIPAY-BFP-01')
const password = ref('bfp12345')
const error = ref('')
const pending = ref(false)

const { bfpLogin } = useAuthSession()

async function submit() {
  error.value = ''
  pending.value = true

  try {
    const user = await bfpLogin({ loginId: loginId.value, password: password.value })
    if (user.role === 'bfp')
      await navigateTo('/bfp/dashboard')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Login failed.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <UContainer class="py-10 max-w-md">
    <UCard class="fyrush-panel">
      <template #header>
        <h1 class="text-2xl font-bold">
          BFP Login
        </h1>
      </template>

      <div class="space-y-4">
        <UFormField label="Department ID">
          <UInput v-model="loginId" />
        </UFormField>
        <UFormField label="Password">
          <UInput
            v-model="password"
            type="password"
          />
        </UFormField>

        <UButton
          block
          color="warning"
          :loading="pending"
          @click="submit"
        >
          Login
        </UButton>

        <p
          v-if="error"
          class="text-sm text-error"
        >
          {{ error }}
        </p>
      </div>
    </UCard>
  </UContainer>
</template>
