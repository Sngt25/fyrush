<script setup lang="ts">
interface IncidentCard {
  status: string
  address: string
}

interface HistoryItem {
  id: string
  status: string
  address: string
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

const historyFormatter = new Intl.DateTimeFormat('en-PH', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
})

const hasMoreHistory = computed(() => props.history.length >= 3)

function formatHistoryDate(timestamp: number) {
  return historyFormatter.format(new Date(timestamp))
}

defineEmits<{
  openSubmit: []
  openLocationPrompt: []
  openMap: []
  openHistory: []
}>()
</script>

<template>
  <main class="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
    <div class="fyrush-location-card rounded-2xl px-4 py-3">
      <div class="flex items-start gap-3">
        <UIcon
          name="i-lucide-map-pin"
          class="size-6 mt-0.5 text-(--fyrush-ink)"
        />
        <div>
          <p class="font-extrabold text-lg leading-tight text-(--fyrush-ink)">
            {{ locationLabel }}
          </p>
          <p class="text-sm text-(--fyrush-ink)/85">
            ({{ locationDetail }})
          </p>
        </div>
      </div>
    </div>

    <div class="flex justify-center pt-2">
      <CitizenReportTriggerButton
        :pending="pending"
        @trigger="$emit('openSubmit')"
      />
    </div>

    <p class="text-center text-sm text-muted">
      Tap to Send Alert
    </p>

    <div class="space-y-3">
      <div class="flex items-center justify-between gap-2">
        <h2 class="font-bold text-lg">
          History Log
        </h2>
        <div class="flex gap-2">
          <UButton
            color="neutral"
            variant="soft"
            size="sm"
            icon="i-lucide-map"
            @click="$emit('openLocationPrompt')"
          >
            Location
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            size="sm"
            icon="i-lucide-map-pinned"
            @click="$emit('openMap')"
          >
            Map
          </UButton>
        </div>
      </div>

      <UCard
        v-if="latestIncident"
        class="bg-(--fyrush-ink) text-white border-none"
      >
        <div class="flex items-start gap-3">
          <UIcon
            name="i-lucide-history"
            class="size-6 mt-0.5"
          />
          <div>
            <p class="font-bold capitalize">
              {{ latestIncident.status }}
            </p>
            <p class="text-sm text-white/85">
              {{ latestIncident.address }}
            </p>
          </div>
        </div>
      </UCard>

      <UCard v-else>
        <p class="text-sm text-muted">
          No incident history yet.
        </p>
      </UCard>

      <UCard v-if="history.length > 0">
        <ul class="space-y-2 text-sm">
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
            <p class="text-xs text-muted/80 mt-1">
              {{ formatHistoryDate(item.createdAt) }}
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
      </UCard>

      <UAlert
        :title="statusMessage"
        color="info"
        variant="soft"
      />
    </div>
  </main>
</template>
