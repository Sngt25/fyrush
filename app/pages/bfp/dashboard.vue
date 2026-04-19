<script setup lang="ts">
import { BARANGAY_KALIPAY_CENTER, INCIDENT_STATUS } from '#shared/fyrush'

definePageMeta({
  layout: 'bfp'
})

const { incidents, fetchIncidents, updateIncidentStatus, updateResponderLocation } = useIncidents()
const { payload, connect, disconnect } = useIncidentSocket()
const { rememberIncidents, notifyNewIncidents } = useIncidentPwaNotifications()
const { toMessage } = useAppError()

const actionError = ref('')
const summary = ref<{
  totalRegisteredUsers: number
  activeReports: number
  totalPointPersons: number
  registeredPointPersons: number
  averageResponseMs: number | null
}>({
  totalRegisteredUsers: 0,
  activeReports: 0,
  totalPointPersons: 0,
  registeredPointPersons: 0,
  averageResponseMs: null
})

const positionWatches = new Map<string, number>()

const activeIncidents = computed(() => incidents.value.filter(item => item.status !== INCIDENT_STATUS.COMPLETED && item.status !== INCIDENT_STATUS.INVALIDATED))

const activeIncidentMarkers = computed(() => activeIncidents.value.map(item => ({
  id: item.id,
  latitude: item.latitude,
  longitude: item.longitude,
  label: item.address,
  kind: 'incident' as const
})))

const responderMarkers = computed(() => {
  const activeIds = new Set(activeIncidents.value.map(item => item.id))

  return (payload.value?.responder || [])
    .filter(item => activeIds.has(item.incidentId))
    .map(item => ({
      id: `responder-${item.incidentId}`,
      latitude: item.latitude,
      longitude: item.longitude,
      label: 'BFP Responder',
      kind: 'responder' as const
    }))
})

const overallMapMarkers = computed(() => [...activeIncidentMarkers.value, ...responderMarkers.value])

onMounted(async () => {
  await Promise.all([fetchIncidents(), fetchSummary()])
  rememberIncidents(incidents.value)
  connect()
})

onBeforeUnmount(() => {
  stopAllLiveShares()
  disconnect()
})

watch(payload, async (value) => {
  if (!value?.incidents)
    return

  incidents.value = value.incidents as typeof incidents.value
  await notifyNewIncidents(value.incidents as typeof incidents.value)
})

function formatElapsedMs(ms: number | null) {
  if (!ms || ms < 0)
    return 'N/A'

  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m ${seconds}s`
}

async function fetchSummary() {
  const response = await $fetch<{ ok: boolean, summary: typeof summary.value }>('/api/bfp/summary')
  summary.value = response.summary
}

function stopLiveShare(incidentId: string) {
  if (!import.meta.client)
    return

  const watchId = positionWatches.get(incidentId)
  if (watchId === undefined)
    return

  navigator.geolocation.clearWatch(watchId)
  positionWatches.delete(incidentId)
}

function stopAllLiveShares() {
  for (const incidentId of positionWatches.keys())
    stopLiveShare(incidentId)
}

async function startLiveShare(incidentId: string) {
  if (!import.meta.client)
    return

  if (!navigator.geolocation) {
    actionError.value = 'Geolocation is not available.'
    return
  }

  for (const activeIncidentId of positionWatches.keys()) {
    if (activeIncidentId !== incidentId)
      stopLiveShare(activeIncidentId)
  }

  if (positionWatches.has(incidentId))
    return

  navigator.geolocation.getCurrentPosition(async (position) => {
    try {
      await updateResponderLocation(incidentId, position.coords.latitude, position.coords.longitude)
    } catch (err) {
      actionError.value = toMessage(err, 'Unable to publish responder location.')
    }
  }, () => {
    // Ignore one-shot lookup failure; continuous watch below can still recover.
  }, {
    enableHighAccuracy: true,
    maximumAge: 2_000,
    timeout: 10_000
  })

  const watchId = navigator.geolocation.watchPosition(async (position) => {
    try {
      await updateResponderLocation(incidentId, position.coords.latitude, position.coords.longitude)
    } catch (err) {
      actionError.value = toMessage(err, 'Unable to update responder location.')
    }
  }, (error) => {
    actionError.value = error.message
  }, {
    enableHighAccuracy: true,
    maximumAge: 2_000,
    timeout: 10_000
  })

  positionWatches.set(incidentId, watchId)
}

async function runAction(incidentId: string, action: 'validate' | 'invalidate' | 'dispatch' | 'complete') {
  actionError.value = ''

  try {
    await updateIncidentStatus(incidentId, action)

    if (action === 'dispatch')
      await startLiveShare(incidentId)

    if (action === 'complete' || action === 'invalidate')
      stopLiveShare(incidentId)

    await fetchSummary()
  } catch (err) {
    actionError.value = toMessage(err, 'Action failed.')
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-3xl font-black fyrush-title">
        Dashboard
      </h1>
    </div>

    <p
      v-if="actionError"
      class="text-sm text-error"
    >
      {{ actionError }}
    </p>

    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <UCard class="fyrush-panel">
        <p class="text-xs text-muted">
          Total Registered Users
        </p>
        <p class="mt-2 text-2xl font-black">
          {{ summary.totalRegisteredUsers }}
        </p>
      </UCard>

      <UCard class="fyrush-panel">
        <p class="text-xs text-muted">
          Avg Response (Timer to Complete)
        </p>
        <p class="mt-2 text-2xl font-black">
          {{ formatElapsedMs(summary.averageResponseMs) }}
        </p>
      </UCard>

      <UCard class="fyrush-panel">
        <p class="text-xs text-muted">
          Active Fire Reports
        </p>
        <p class="mt-2 text-2xl font-black">
          {{ summary.activeReports }}
        </p>
      </UCard>

      <UCard class="fyrush-panel">
        <p class="text-xs text-muted">
          Registered Point Persons
        </p>
        <p class="mt-2 text-2xl font-black">
          {{ summary.registeredPointPersons }} / {{ summary.totalPointPersons }}
        </p>
      </UCard>
    </div>

    <UCard class="fyrush-panel">
      <template #header>
        <div class="flex items-center justify-between gap-2">
          <p class="font-bold text-lg">
            Active Incidents Map
          </p>
          <p class="text-xs text-muted">
            Centered near barangay Kalipay
          </p>
        </div>
      </template>

      <BfpIncidentMap
        :center="[BARANGAY_KALIPAY_CENTER.lat, BARANGAY_KALIPAY_CENTER.lng]"
        :zoom="14"
        :markers="overallMapMarkers"
        map-height="24rem"
      />
    </UCard>

    <div class="grid gap-4 lg:grid-cols-2">
      <BfpIncidentCard
        v-for="incident in activeIncidents"
        :key="incident.id"
        :incident="incident"
        @action="runAction"
      />

      <UCard
        v-if="activeIncidents.length === 0"
        class="fyrush-panel lg:col-span-2"
      >
        <p class="text-sm text-muted">
          No active fire reports right now.
        </p>
      </UCard>
    </div>
  </div>
</template>
