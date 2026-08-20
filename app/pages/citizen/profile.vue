<script setup lang="ts">
import { BARANGAY_KALIPAY_CENTER, USER_ROLE } from '#shared/fyrush'

const pending = ref(false)
const toast = useToast()
const { toMessage } = useAppError()

const form = reactive({
  name: '',
  mobile: '',
  address: ''
})

const { user, completeProfile } = useAuthSession()

const isUpdateMode = computed(() => Boolean(user.value?.profileComplete))

const isBfp = computed(() => user.value?.role === USER_ROLE.BFP)
const needsRegisteredPoint = computed(() => !isBfp.value)

const pin = ref<[number, number] | null>(null)
const draftPin = ref<[number, number]>([BARANGAY_KALIPAY_CENTER.lng, BARANGAY_KALIPAY_CENTER.lat])
const gpsStatus = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const gpsError = ref('')

watch(user, (value) => {
  if (!value)
    return

  form.name = value.name ?? ''
  form.mobile = value.mobile ?? ''
  form.address = value.address ?? ''

  if (typeof value.registeredLat === 'number' && typeof value.registeredLng === 'number') {
    const point: [number, number] = [value.registeredLng, value.registeredLat]
    pin.value = point
    draftPin.value = point
  }
}, { immediate: true })

function onDraftPinChange(value: [number, number]) {
  draftPin.value = value
  pin.value = value
  gpsStatus.value = 'success'
}

function useCurrentLocation() {
  if (import.meta.server || !('geolocation' in navigator)) {
    gpsStatus.value = 'error'
    gpsError.value = 'Geolocation is not supported in this browser. Tap the map to drop your pin instead.'
    return
  }

  gpsStatus.value = 'loading'
  gpsError.value = ''

  navigator.geolocation.getCurrentPosition(
    (position) => {
      onDraftPinChange([position.coords.longitude, position.coords.latitude])
    },
    (error) => {
      gpsStatus.value = 'error'
      gpsError.value = `Location failed: ${error.message}. Tap the map to drop your pin instead.`
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
  )
}

async function submit() {
  if (needsRegisteredPoint.value && !pin.value) {
    toast.add({
      title: 'Pin your location',
      description: 'Use "Use my current location" or tap the map to confirm where you are, then save.',
      color: 'warning',
      icon: 'i-lucide-map-pin'
    })
    return
  }

  pending.value = true

  try {
    const shouldStayOnPage = isUpdateMode.value
    const result = await completeProfile({
      name: form.name,
      mobile: form.mobile,
      address: form.address,
      registeredLat: needsRegisteredPoint.value ? (pin.value ? pin.value[1] : null) : null,
      registeredLng: needsRegisteredPoint.value ? (pin.value ? pin.value[0] : null) : null
    })

    if (shouldStayOnPage) {
      toast.add({
        title: 'Profile updated',
        description: 'Your name, mobile number, address, and set location were saved.',
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
  <div class="min-h-screen flex items-center justify-center">
    <UContainer class="py-8 max-w-xl">
      <UCard class="fyrush-panel border border-default/70 shadow-xl">
        <template #header>
          <div class="space-y-1">
            <h1 class="text-2xl font-black">
              {{ isUpdateMode ? 'Update profile' : 'Complete your profile' }}
            </h1>
            <p class="text-sm text-muted">
              {{ isUpdateMode
                ? 'Keep your mobile number, address, and set location up to date so responders can reach you quickly.'
                : 'Mobile number, address, and your set location are required before you can report fires.' }}
            </p>
          </div>
        </template>

        <div class="space-y-4 bred500">
          <UFormField
            label="Full name"
            required
            class="w-full"
          >
            <UInput
              v-model="form.name"
              placeholder="Enter your full name"
              class="w-full"
            />
          </UFormField>

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
              :rows="3"
              placeholder="Enter your full address"
              class="w-full"
            />
          </UFormField>

          <UFormField
            v-if="needsRegisteredPoint"
            label="Set location"
            required
            hint="This becomes your default report location. Use your current location or tap the map to pin your home."
            class="w-full"
          >
            <div class="space-y-3">
              <div class="flex flex-col sm:flex-row gap-2">
                <UButton
                  icon="i-lucide-locate-fixed"
                  color="primary"
                  variant="solid"
                  :loading="gpsStatus === 'loading'"
                  @click="useCurrentLocation"
                >
                  Use my current location
                </UButton>

                <p class="text-xs text-muted self-center">
                  <template v-if="gpsStatus === 'success'">
                    Pin confirmed at {{ pin ? `${pin[1].toFixed(5)}, ${pin[0].toFixed(5)}` : '' }}
                  </template>
                  <template v-else-if="gpsStatus === 'error'">
                    {{ gpsError }}
                  </template>
                  <template v-else>
                    Then review the pin on the map before saving.
                  </template>
                </p>
              </div>

              <CitizenReportMap
                :manual-marker="draftPin"
                :user-has-registered-point="pin !== null"
                :registered-point="pin"
                :show-manual-marker="false"
                map-height="20rem"
                @update:manual-marker="onDraftPinChange"
              />
            </div>
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
  </div>
</template>
