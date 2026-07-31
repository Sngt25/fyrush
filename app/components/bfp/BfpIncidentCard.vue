<script setup lang="ts">
import { INCIDENT_STATUS } from '#shared/fyrush'

const props = withDefaults(defineProps<{
  incident: {
    id: string
    address: string
    description: string | null
    status: string
    reportCount: number
    createdAt: number
    latitude: number
    longitude: number
    validatedAt: number | null
    dispatchedAt: number | null
    closedAt: number | null
    invalidatedAt: number | null
    timerStartedAt: number | null
    reportingUsers?: Array<{ userId: string, userName: string }>
    hasManualPinnedReport?: boolean
    manualPinnedReportCount?: number
  }
  showReportingUsers?: boolean
}>(), {
  showReportingUsers: false
})

const emit = defineEmits<{
  action: [incidentId: string, action: 'validate' | 'invalidate' | 'dispatch' | 'complete']
}>()

const mapOpen = ref(false)

const timestampFormat = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
} as const

const timelineItems = computed(() => {
  const items: Array<{ label: string, at: number | null }> = [
    { label: 'Reported', at: props.incident.createdAt },
    { label: 'Validated', at: props.incident.validatedAt },
    { label: 'Responded', at: props.incident.dispatchedAt },
    { label: 'Completed', at: props.incident.closedAt }
  ]

  if (props.incident.invalidatedAt)
    items.push({ label: 'Invalidated', at: props.incident.invalidatedAt })

  return items
})

function statusBadgeColor(status: string) {
  if (status === INCIDENT_STATUS.NEW)
    return 'warning'
  if (status === INCIDENT_STATUS.VALIDATED)
    return 'info'
  if (status === INCIDENT_STATUS.ON_THE_WAY)
    return 'error'
  if (status === INCIDENT_STATUS.INVALIDATED)
    return 'neutral'
  return 'success'
}

function formatElapsedMs(ms: number | null) {
  if (!ms || ms < 0)
    return 'N/A'

  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m ${seconds}s`
}

function incidentCompletionDuration(incident: { dispatchedAt: number | null, closedAt: number | null }) {
  if (!incident.dispatchedAt || !incident.closedAt)
    return null

  return incident.closedAt - incident.dispatchedAt
}
</script>

<template>
  <UCard class="fyrush-panel">
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <p class="font-bold">
          {{ incident.address }}
        </p>
        <UBadge
          :color="statusBadgeColor(incident.status)"
          variant="soft"
        >
          {{ incident.status }}
        </UBadge>
      </div>
    </template>

    <div class="space-y-3 text-sm">
      <p
        v-if="incident.description"
        class="text-muted text-xs italic"
      >
        {{ incident.description }}
      </p>
      <div class="grid gap-2 sm:grid-cols-2">
        <p>Reports: {{ incident.reportCount }}</p>
        <p>
          Created:
          <NuxtTime
            :datetime="new Date(incident.createdAt)"
            :year="timestampFormat.year"
            :month="timestampFormat.month"
            :day="timestampFormat.day"
            :hour="timestampFormat.hour"
            :minute="timestampFormat.minute"
          />
        </p>
        <p v-if="incident.status === INCIDENT_STATUS.COMPLETED">
          BFP response time: {{ formatElapsedMs(incidentCompletionDuration(incident)) }}
        </p>
        <p v-if="incident.hasManualPinnedReport">
          Manual pin: {{ incident.latitude.toFixed(5) }}, {{ incident.longitude.toFixed(5) }}
        </p>
      </div>

      <div class="rounded-xl border border-default bg-muted/40 p-3 space-y-1">
        <p class="text-xs font-semibold text-muted uppercase tracking-wide">
          Status Timeline
        </p>
        <div class="grid gap-1">
          <p
            v-for="item in timelineItems"
            :key="item.label"
            class="text-xs"
          >
            <span class="font-semibold">{{ item.label }}: </span>
            <span v-if="item.at">
              <NuxtTime
                :datetime="new Date(item.at)"
                :year="timestampFormat.year"
                :month="timestampFormat.month"
                :day="timestampFormat.day"
                :hour="timestampFormat.hour"
                :minute="timestampFormat.minute"
              />
            </span>
            <span v-else>Pending</span>
          </p>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <UButton
          size="sm"
          :disabled="incident.status !== INCIDENT_STATUS.NEW"
          @click="emit('action', incident.id, 'validate')"
        >
          Validate
        </UButton>
        <UButton
          size="sm"
          color="neutral"
          :disabled="incident.status === INCIDENT_STATUS.COMPLETED || incident.status === INCIDENT_STATUS.INVALIDATED"
          @click="emit('action', incident.id, 'invalidate')"
        >
          Invalidate
        </UButton>
        <UButton
          size="sm"
          color="error"
          :disabled="incident.status !== INCIDENT_STATUS.VALIDATED"
          @click="emit('action', incident.id, 'dispatch')"
        >
          Respond
        </UButton>
        <UButton
          size="sm"
          color="success"
          :disabled="incident.status !== INCIDENT_STATUS.ON_THE_WAY"
          @click="emit('action', incident.id, 'complete')"
        >
          Complete
        </UButton>
      </div>

      <UButton
        size="sm"
        color="neutral"
        variant="outline"
        icon="i-lucide-map"
        @click="mapOpen = true"
      >
        View Map
      </UButton>

      <div
        v-if="showReportingUsers"
        class="rounded-xl border border-default bg-muted/40 p-3 space-y-1"
      >
        <p class="text-xs font-semibold text-muted uppercase tracking-wide">
          Reporters ({{ incident.reportingUsers?.length ?? incident.reportCount }})
        </p>
        <p
          v-if="incident.reportingUsers && incident.reportingUsers.length > 0"
          class="text-xs"
        >
          <span
            v-for="user in incident.reportingUsers"
            :key="user.userId"
            class="inline-flex items-center gap-1 rounded-full border border-default bg-muted px-2 py-0.5 mr-1 mb-1"
          >
            <span class="font-semibold">{{ user.userName }}</span>
          </span>
        </p>
        <p
          v-else
          class="text-xs text-muted"
        >
          {{ incident.reportCount }} report{{ incident.reportCount === 1 ? '' : 's' }} (names unavailable)
        </p>
      </div>
    </div>

    <UModal
      v-model:open="mapOpen"
      title="Incident Map"
    >
      <template #body>
        <BfpIncidentMap
          :center="[incident.latitude, incident.longitude]"
          :zoom="17"
          :markers="[
            {
              id: incident.id,
              latitude: incident.latitude,
              longitude: incident.longitude,
              label: incident.address,
              kind: 'incident'
            }
          ]"
          map-height="22rem"
        />
      </template>
    </UModal>
  </UCard>
</template>
