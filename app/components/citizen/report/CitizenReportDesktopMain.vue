<script setup lang="ts">
import { INCIDENT_STATUS } from '#shared/fyrush'

interface IncidentCard {
  status: string
  address: string
  description: string | null
  reportCount: number
  dispatchedAt: number | null
  closedAt: number | null
}

interface HistoryItem {
  id: string
  status: string
  address: string
  description: string | null
  reportCount: number
  dispatchedAt: number | null
  closedAt: number | null
  createdAt: number
}

const props = defineProps<{
  locationLabel: string
  locationDetail: string
  pending: boolean
  latestIncident: IncidentCard | null
  history: HistoryItem[]
  statusMessage: string
}>()

defineEmits<{
  openSubmit: []
  openMap: []
  openHistory: []
}>()

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

const absoluteDateFormat = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
} as const

const hasMoreHistory = computed(() => props.history.length >= 3)

function shouldShowAbsoluteDate(timestamp: number) {
  return Date.now() - timestamp >= THIRTY_DAYS_MS
}

function formatElapsedMs(ms: number | null) {
  if (!ms || ms < 0)
    return 'N/A'

  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m ${seconds}s`
}

function completionDuration(dispatchedAt: number | null, closedAt: number | null) {
  if (!dispatchedAt || !closedAt)
    return null

  return closedAt - dispatchedAt
}
</script>

<template>
  <main class="flex-1 min-h-0 overflow-y-auto p-6">
    <div class="grid grid-cols-12 gap-6">
      <section class="col-span-7 space-y-5">
        <UCard class="fyrush-location-card border-none">
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-start gap-3">
              <UIcon
                name="i-lucide-map-pin"
                class="size-7 mt-0.5 text-(--fyrush-ink)"
              />
              <div>
                <p class="font-extrabold text-xl text-(--fyrush-ink)">
                  {{ locationLabel }}
                </p>
                <p class="text-sm text-(--fyrush-ink)/85">
                  {{ locationDetail }}
                </p>
              </div>
            </div>
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-map"
              @click="$emit('openMap')"
            >
              Open Map
            </UButton>
          </div>
        </UCard>

        <UCard class="fyrush-panel">
          <div class="space-y-4">
            <p class="text-sm text-muted">
              Emergency Action
            </p>
            <div class="flex justify-center pt-2">
              <CitizenReportTriggerButton
                :pending="pending"
                @trigger="$emit('openSubmit')"
              />
            </div>
            <UAlert
              :title="statusMessage"
              color="info"
              variant="soft"
            />
          </div>
        </UCard>
      </section>

      <section class="col-span-5 space-y-4">
        <UCard
          v-if="latestIncident"
          class="border-none"
        >
          <template #header>
            <h2 class="font-bold text-lg">
              Latest Incident
            </h2>
          </template>
          <p class="font-semibold capitalize">
            {{ latestIncident.status }}
          </p>
          <p class="text-sm mt-1">
            {{ latestIncident.address }}
          </p>
          <p
            v-if="latestIncident.description"
            class="text-xs text-muted mt-1"
          >
            {{ latestIncident.description }}
          </p>
          <p class="text-xs text-muted mt-1">
            Reporters: {{ latestIncident.reportCount }}
          </p>
          <p
            v-if="latestIncident.status === INCIDENT_STATUS.COMPLETED"
            class="text-xs text-muted mt-1"
          >
            BFP response time: {{ formatElapsedMs(completionDuration(latestIncident.dispatchedAt, latestIncident.closedAt)) }}
          </p>
        </UCard>

        <UCard v-else>
          <template #header>
            <h2 class="font-bold text-lg">
              Latest Incident
            </h2>
          </template>
          <p class="text-sm text-muted">
            No incident history yet.
          </p>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="font-bold text-lg">
              History Log
            </h2>
          </template>
          <ul
            v-if="history.length > 0"
            class="space-y-2 text-sm"
          >
            <li
              v-for="item in history"
              :key="item.id"
              class="border-b border-default pb-2 last:border-b-0"
            >
              <p class="font-semibold capitalize">
                {{ item.status }}
              </p>
              <p class="text-muted">
                {{ item.address }}
              </p>
              <p
                v-if="item.description"
                class="text-xs text-muted/80 mt-1"
              >
                D                {{ item.description }}
              </p>
              <p class="text-xs text-muted/80 mt-1">
                Reporters: {{ item.reportCount }}
              </p>
              <p
                v-if="item.status === INCIDENT_STATUS.COMPLETED"
                class="text-xs text-muted/80 mt-1"
              >
                BFP response time: {{ formatElapsedMs(completionDuration(item.dispatchedAt, item.closedAt)) }}
              </p>
              <p class="text-xs text-muted/80 mt-1">
                <NuxtTime
                  v-if="shouldShowAbsoluteDate(item.createdAt)"
                  :datetime="new Date(item.createdAt)"
                  :year="absoluteDateFormat.year"
                  :month="absoluteDateFormat.month"
                  :day="absoluteDateFormat.day"
                  :hour="absoluteDateFormat.hour"
                  :minute="absoluteDateFormat.minute"
                />
                <NuxtTime
                  v-else
                  :datetime="new Date(item.createdAt)"
                  relative
                />
              </p>
            </li>
          </ul>
          <div
            v-if="hasMoreHistory"
            class="pt-3"
          >
            <UButton
              color="neutral"
              variant="soft"
              size="sm"
              icon="i-lucide-chevron-right"
              @click="$emit('openHistory')"
            >
              See more
            </UButton>
          </div>
          <p
            v-if="history.length === 0"
            class="text-sm text-muted"
          >
            No incident history yet.
          </p>
        </UCard>
      </section>
    </div>
  </main>
</template>
