<script setup lang="ts">
const pending = ref(false)
const error = ref('')

const form = reactive({
  mobile: '',
  address: ''
})

const { completeProfile } = useAuthSession()

async function submit() {
  pending.value = true
  error.value = ''

  try {
    const result = await completeProfile({
      mobile: form.mobile,
      address: form.address
    })

    await navigateTo(result.nextPath)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to complete profile.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <UContainer class="py-8 max-w-xl">
    <UCard class="fyrush-panel border border-default/70 shadow-xl">
      <template #header>
        <div class="space-y-1">
          <h1 class="text-2xl font-black fyrush-title">
            Complete your profile
          </h1>
          <p class="text-sm text-muted">
            Mobile number and address are required before you can access protected routes.
          </p>
        </div>
      </template>

      <div class="space-y-4">
        <UFormField
          label="Mobile number"
          required
        >
          <UInput
            v-model="form.mobile"
            placeholder="09xxxxxxxxx"
          />
        </UFormField>

        <UFormField
          label="Address"
          required
        >
          <UTextarea
            v-model="form.address"
            :rows="4"
            placeholder="Enter your full address"
          />
        </UFormField>

        <UButton
          block
          color="primary"
          :loading="pending"
          @click="submit"
        >
          Save and continue
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
