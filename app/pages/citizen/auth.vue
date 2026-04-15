<script setup lang="ts">
const mode = ref<'login' | 'signup'>('login')
const pending = ref(false)
const error = ref('')

const loginForm = reactive({
  email: '',
  password: ''
})

const signupForm = reactive({
  name: '',
  email: '',
  password: ''
})

const { citizenLogin, citizenSignup } = useAuthSession()

async function submitLogin() {
  pending.value = true
  error.value = ''

  try {
    await citizenLogin({
      email: loginForm.email,
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
  <UContainer class="py-8 max-w-md">
    <UCard class="fyrush-panel border border-default/70 shadow-xl">
      <template #header>
        <div class="space-y-4">
          <div class="flex justify-center">
            <AppLogo class="w-44 h-auto" />
          </div>
          <div class="flex items-center justify-between gap-3">
            <h1 class="text-2xl font-black fyrush-title">
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
        </div>
      </template>

      <div
        v-if="mode === 'login'"
        class="space-y-4"
      >
        <UFormField
          label="Email Address"
          class="w-full"
        >
          <UInput
            v-model="loginForm.email"
            type="email"
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

      <div v-else class="space-y-4">
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
          label="Email Address"
          class="w-full"
        >
          <UInput
            v-model="signupForm.email"
            type="email"
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
        class="text-sm text-error mt-3 text-center"
      >
        {{ error }}
      </p>
    </UCard>
  </UContainer>
</template>
