<script setup lang="ts">
definePageMeta({
  layout: 'bfp'
})

const toast = useToast()
const { toMessage } = useAppError()

const actionError = ref('')
const pointPersonEmail = ref('')
const loadingPointPersons = ref(false)

const pointPersons = ref<Array<{
  id: string
  email: string | null
  name: string
  mobile: string | null
  address: string | null
  registered: boolean
  createdAt: number
}>>([])

onMounted(async () => {
  await fetchPointPersons()
})

async function fetchPointPersons() {
  loadingPointPersons.value = true

  try {
    const response = await $fetch<{ ok: boolean, pointPersons: typeof pointPersons.value }>('/api/bfp/point-persons')
    pointPersons.value = response.pointPersons
  } finally {
    loadingPointPersons.value = false
  }
}

async function addPointPerson() {
  actionError.value = ''

  try {
    const response = await $fetch<{ alreadyExists?: boolean }>('/api/bfp/point-persons', {
      method: 'POST',
      body: { email: pointPersonEmail.value }
    })

    pointPersonEmail.value = ''
    await fetchPointPersons()
    toast.add({
      title: response.alreadyExists ? 'Existing user found' : 'Point person saved',
      description: response.alreadyExists
        ? 'This email already belongs to a user and can now be assigned directly as point person for incidents.'
        : 'The email is now registered for point person onboarding.',
      color: 'success',
      icon: 'i-lucide-user-plus'
    })
  } catch (err) {
    actionError.value = toMessage(err, 'Unable to save point person email.')
  }
}

async function removePointPerson(id: string) {
  actionError.value = ''

  try {
    await $fetch(`/api/bfp/point-persons/${id}`, {
      method: 'DELETE'
    })

    await fetchPointPersons()
  } catch (err) {
    actionError.value = toMessage(err, 'Unable to remove point person.')
  }
}
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-3xl text-black font-bold">
      Point Persons
    </h1>

    <p
      v-if="actionError"
      class="text-sm text-error"
    >
      {{ actionError }}
    </p>

    <UCard class="fyrush-panel">
      <template #header>
        <p class="font-bold text-lg">
          Add Point Person
        </p>
      </template>

      <div class="flex flex-col sm:flex-row gap-2">
        <UInput
          v-model="pointPersonEmail"
          type="email"
          placeholder="pointperson@example.com"
          class="flex-1"
        />
        <UButton
          color="error"
          :disabled="!pointPersonEmail"
          @click="addPointPerson"
        >
          Add
        </UButton>
      </div>
    </UCard>

    <UCard class="fyrush-panel">
      <template #header>
        <p class="font-bold text-lg">
          Point Person Directory
        </p>
      </template>

      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="text-left border-b border-default">
              <th class="py-2 pr-4">
                Name
              </th>
              <th class="py-2 pr-4">
                Mobile
              </th>
              <th class="py-2 pr-4">
                Email
              </th>
              <th class="py-2 pr-4">
                Address
              </th>
              <th class="py-2 pr-4">
                Status
              </th>
              <th class="py-2 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="person in pointPersons"
              :key="person.id"
              class="border-b border-default"
            >
              <td class="py-2 pr-4">
                {{ person.name }}
              </td>
              <td class="py-2 pr-4">
                {{ person.mobile }}
              </td>
              <td class="py-2 pr-4">
                {{ person.email }}
              </td>
              <td class="py-2 pr-4">
                {{ person.address }}
              </td>
              <td class="py-2 pr-4">
                <UBadge
                  :color="person.registered ? 'success' : 'warning'"
                  variant="soft"
                >
                  {{ person.registered ? 'Registered' : 'Unregistered' }}
                </UBadge>
              </td>
              <td class="py-2 text-right">
                <UButton
                  size="xs"
                  color="error"
                  variant="outline"
                  icon="i-lucide-trash-2"
                  @click="removePointPerson(person.id)"
                >
                  Delete
                </UButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p
        v-if="!loadingPointPersons && pointPersons.length === 0"
        class="text-sm text-muted"
      >
        No point persons yet.
      </p>
    </UCard>
  </div>
</template>
