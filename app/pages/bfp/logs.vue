<script setup lang="ts">
import { INCIDENT_STATUS } from '#shared/fyrush'

definePageMeta({
  layout: 'bfp'
})

const { incidents, fetchIncidents, updateIncidentStatus, updateResponderLocation } = useIncidents()
const { payload, connect, disconnect } = useIncidentSocket()
const { rememberIncidents, notifyNewIncidents } = useIncidentPwaNotifications()
const { toMessage } = useAppError()

const actionError = ref('')
const logFilter = ref<'active' | 'history'>('active')
const positionWatches = new Map<string, number>()

const activeIncidents = computed(() => incidents.value.filter(item => item.status !== INCIDENT_STATUS.COMPLETED && item.status !== INCIDENT_STATUS.INVALIDATED))
const historyIncidents = computed(() => incidents.value.filter(item => item.status === INCIDENT_STATUS.COMPLETED || item.status === INCIDENT_STATUS.INVALIDATED))
const logIncidents = computed(() => logFilter.value === 'active' ? activeIncidents.value : historyIncidents.value)

onMounted(async () => {
  await fetchIncidents()
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

  const existing = new Map(incidents.value.map(item => [item.id, item]))
  const staleReporting = value.incidents.some((item) => {
    const known = existing.get(item.id)
    return !known
      || (item.reportCount > (known.reportingUsers?.length ?? 0))
  })

  incidents.value = value.incidents.map((item) => {
    const known = existing.get(item.id)
    if (!known)
      return item

    return {
      ...item,
      reportingUsers: known.reportingUsers,
      hasManualPinnedReport: known.hasManualPinnedReport,
      manualPinnedReportCount: known.manualPinnedReportCount
    }
  }) as typeof incidents.value

  if (staleReporting)
    await fetchIncidents()

  await notifyNewIncidents(value.incidents as typeof incidents.value)
})

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
  } catch (err) {
    actionError.value = toMessage(err, 'Action failed.')
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-3xl text-black font-bold">
        Logs
      </h1>
    </div>

    <p
      v-if="actionError"
      class="text-sm text-error"
    >
      {{ actionError }}
    </p>

    <div class="flex gap-2">
      <UButton
        :color="logFilter === 'active' ? 'error' : 'neutral'"
        :variant="logFilter === 'active' ? 'solid' : 'outline'"
        @click="logFilter = 'active'"
      >
        Active Logs
      </UButton>
      <UButton
        :color="logFilter === 'history' ? 'error' : 'neutral'"
        :variant="logFilter === 'history' ? 'solid' : 'outline'"
        @click="logFilter = 'history'"
      >
        History
      </UButton>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <BfpIncidentCard
        v-for="incident in logIncidents"
        :key="incident.id"
        :incident="incident"
        show-reporting-users
        @action="runAction"
      />

      <UCard
        v-if="logIncidents.length === 0"
        class="fyrush-panel lg:col-span-2"
      >
        <p class="text-sm text-muted">
          No log entries for this filter yet.
        </p>
      </UCard>
    </div>
  </div>
</template>
