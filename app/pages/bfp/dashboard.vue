<script setup lang="ts">
const { user, refreshUser, logout } = useAuthSession()
const { incidents, fetchIncidents, updateIncidentStatus, updateResponderLocation, assignPointPerson } = useIncidents()
const { payload, connect, disconnect } = useIncidentSocket()
const { rememberIncidents, notifyNewIncidents } = useIncidentPwaNotifications()

const actionError = ref('')

onMounted(async () => {
  const current = await refreshUser()
  if (!current || current.role !== 'bfp') {
    await navigateTo('/bfp/login')
    return
  }

  await fetchIncidents()
  rememberIncidents(incidents.value)
  connect()
})

onBeforeUnmount(() => disconnect())

watch(payload, async (value) => {
  if (!value?.incidents)
    return

  incidents.value = value.incidents as typeof incidents.value
  await notifyNewIncidents(value.incidents as typeof incidents.value)
})

async function runAction(incidentId: string, action: 'validate' | 'start_timer' | 'dispatch' | 'complete') {
  actionError.value = ''

  try {
    await updateIncidentStatus(incidentId, action)
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Action failed.'
  }
}

async function shareCurrentLocation(incidentId: string) {
  actionError.value = ''

  if (!navigator.geolocation) {
    actionError.value = 'Geolocation is not available.'
    return
  }

  navigator.geolocation.getCurrentPosition(async (position) => {
    await updateResponderLocation(incidentId, position.coords.latitude, position.coords.longitude)
  }, (error) => {
    actionError.value = error.message
  })
}

async function quickAssign(incidentId: string, userId?: string) {
  if (!userId)
    return

  try {
    await assignPointPerson(incidentId, userId)
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Assign failed.'
  }
}

async function signOut() {
  await logout()
  await navigateTo('/')
}
</script>

<template>
  <UContainer class="py-6 max-w-6xl space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-3xl font-black fyrush-title">
          BFP Dashboard
        </h1>
        <p class="text-sm text-muted">
          {{ user?.name }}
        </p>
      </div>
      <UButton
        color="neutral"
        variant="outline"
        @click="signOut"
      >
        Logout
      </UButton>
    </div>

    <p
      v-if="actionError"
      class="text-sm text-error"
    >
      {{ actionError }}
    </p>

    <div class="grid gap-4 lg:grid-cols-2">
      <UCard
        v-for="incident in incidents"
        :key="incident.id"
        class="fyrush-panel"
      >
        <template #header>
          <div class="flex items-center justify-between gap-2">
            <p class="font-bold">
              {{ incident.address }}
            </p>
            <UBadge
              color="warning"
              variant="soft"
            >
              {{ incident.status }}
            </UBadge>
          </div>
        </template>

        <div class="space-y-2 text-sm">
          <p>Reports: {{ incident.reportCount }}</p>
          <p>Created: {{ new Date(incident.createdAt).toLocaleTimeString() }}</p>

          <div class="grid grid-cols-2 gap-2 pt-2">
            <UButton
              size="sm"
              @click="runAction(incident.id, 'validate')"
            >
              Validate
            </UButton>
            <UButton
              size="sm"
              color="warning"
              @click="runAction(incident.id, 'start_timer')"
            >
              Start Timer
            </UButton>
            <UButton
              size="sm"
              color="error"
              @click="runAction(incident.id, 'dispatch')"
            >
              Respond (OTW)
            </UButton>
            <UButton
              size="sm"
              color="success"
              @click="runAction(incident.id, 'complete')"
            >
              Complete
            </UButton>
          </div>

          <div class="grid grid-cols-2 gap-2 pt-2">
            <UButton
              size="sm"
              variant="outline"
              @click="shareCurrentLocation(incident.id)"
            >
              Share Live Location
            </UButton>
            <UButton
              size="sm"
              variant="outline"
              @click="quickAssign(incident.id, incident.reportingUsers?.[0]?.userId)"
            >
              Assign 1st Reporter
            </UButton>
          </div>

          <div
            v-if="incident.reportingUsers?.length"
            class="pt-2"
          >
            <p class="font-semibold text-xs text-muted">
              Reporting Users
            </p>
            <ul class="text-xs list-disc pl-4">
              <li
                v-for="reporter in incident.reportingUsers"
                :key="reporter.userId + incident.id"
              >
                {{ reporter.userName }}
              </li>
            </ul>
          </div>
        </div>
      </UCard>
    </div>
  </UContainer>
</template>
