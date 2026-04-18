<script setup lang="ts">
const pending = ref(false)
const toast = useToast()
const { toMessage } = useAppError()

const form = reactive({
  mobile: '',
  address: ''
})

const { user, completeProfile } = useAuthSession()

const isUpdateMode = computed(() => Boolean(user.value?.profileComplete))

watch(user, (value) => {
  if (!value)
    return

  form.mobile = value.mobile ?? ''
  form.address = value.address ?? ''
}, { immediate: true })

async function submit() {
  pending.value = true

  try {
    const shouldStayOnPage = isUpdateMode.value
    const result = await completeProfile({
      mobile: form.mobile,
      address: form.address
    })

    if (shouldStayOnPage) {
      toast.add({
        title: 'Profile updated',
        description: 'Your mobile number and address were saved.',
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
      return
    }

    await navigateTo(result.nextPath)
  } catch (err) {
    toast.add({
      title: 'Unable to save profile',
      description: toMessage(err, 'Failed to save profile.'),
      color: 'error',
      icon: 'i-lucide-triangle-alert'
    })
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
            {{ isUpdateMode ? 'Update profile' : 'Complete your profile' }}
          </h1>
          <p class="text-sm text-muted">
            {{ isUpdateMode
              ? 'Keep your mobile number and address up to date so responders can contact you quickly.'
              : 'Mobile number and address are required before you can access protected routes.' }}
          </p>
        </div>
      </template>

      <div class="space-y-4 bred500">
        <UFormField
          label="Mobile number"
          required
          class="w-full"
        >
          <UInput
            v-model="form.mobile"
            placeholder="09xxxxxxxxx"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Address"
          required
          class="w-full"
        >
          <UTextarea
            v-model="form.address"
            :rows="4"
            placeholder="Enter your full address"
            class="w-full"
          />
        </UFormField>

        <UButton
          block
          color="primary"
          :loading="pending"
          @click="submit"
        >
          {{ isUpdateMode ? 'Save changes' : 'Save and continue' }}
        </UButton>

        <UButton
          v-if="isUpdateMode"
          block
          variant="ghost"
          to="/citizen/report"
        >
          Back to report
        </UButton>
      </div>
    </UCard>
  </UContainer>
</template>
