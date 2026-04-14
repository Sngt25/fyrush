<script setup lang="ts">
const mode = ref<'login' | 'signup'>('login')
const pending = ref(false)
const error = ref('')

const loginForm = reactive({
  mobile: '',
  password: ''
})

const signupForm = reactive({
  name: '',
  mobile: '',
  address: '',
  password: '',
  registeredLat: undefined as number | undefined,
  registeredLng: undefined as number | undefined
})

const { citizenLogin, citizenSignup } = useAuthSession()
const { latitude, longitude, requestLocation, geoStatus } = useDeviceCapabilities()

watch([latitude, longitude], () => {
  if (latitude.value !== null)
    signupForm.registeredLat = latitude.value
  if (longitude.value !== null)
    signupForm.registeredLng = longitude.value
})

async function submitLogin() {
  pending.value = true
  error.value = ''

  try {
    await citizenLogin({
      mobile: loginForm.mobile,
      password: loginForm.password
    })

    await navigateTo('/citizen/report')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unable to log in.'
  } finally {
    pending.value = false
  }
}

async function submitSignup() {
  pending.value = true
  error.value = ''

  try {
    await citizenSignup({ ...signupForm })
    await navigateTo('/citizen/report')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unable to create account.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <UContainer class="py-10 max-w-lg">
    <UCard class="fyrush-panel">
      <template #header>
        <div class="flex items-center justify-between gap-3">
          <h1 class="text-2xl font-bold">
            Citizen {{ mode === 'login' ? 'Login' : 'Sign Up' }}
          </h1>
          <UButton
            color="neutral"
            variant="ghost"
            @click="mode = mode === 'login' ? 'signup' : 'login'"
          >
            {{ mode === 'login' ? 'Create account' : 'Have account?' }}
          </UButton>
        </div>
      </template>

      <div
        v-if="mode === 'login'"
        class="space-y-4"
      >
        <UFormField
          label="Mobile Number"
          class="w-full"
        >
          <UInput
            v-model="loginForm.mobile"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Password"
          class="w-full"
        >
          <UInput
            v-model="loginForm.password"
            type="password"
            class="w-full"
          />
        </UFormField>

        <UButton
          block
          color="error"
          :loading="pending"
          @click="submitLogin"
        >
          Log In
        </UButton>
      </div>

      <div
        v-else
        class="space-y-4"
      >
        <UFormField
          label="Name"
          class="w-full"
        >
          <UInput
            v-model="signupForm.name"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Mobile Number"
          class="w-full"
        >
          <UInput
            v-model="signupForm.mobile"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Exact Address"
          class="w-full"
        >
          <UTextarea
            v-model="signupForm.address"
            :rows="2"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Password"
          class="w-full"
        >
          <UInput
            v-model="signupForm.password"
            type="password"
            class="w-full"
          />
        </UFormField>

        <div class="rounded-lg border border-default p-3 space-y-2">
          <p class="text-xs text-muted">
            Registered location capture (recommended)
          </p>
          <UButton
            size="sm"
            variant="outline"
            icon="i-lucide-map-pin"
            @click="requestLocation"
          >
            Use my current location
          </UButton>
          <p class="text-xs text-muted">
            {{ geoStatus }}
          </p>
          <p
            v-if="signupForm.registeredLat && signupForm.registeredLng"
            class="text-xs"
          >
            Lat: {{ signupForm.registeredLat.toFixed(6) }} / Lng: {{ signupForm.registeredLng.toFixed(6) }}
          </p>
        </div>

        <UButton
          block
          color="error"
          :loading="pending"
          @click="submitSignup"
        >
          Sign Up
        </UButton>
      </div>

      <p
        v-if="error"
        class="text-sm text-error mt-3"
      >
        {{ error }}
      </p>
    </UCard>
  </UContainer>
</template>
