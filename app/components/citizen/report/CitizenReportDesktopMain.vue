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
  openMap: []
  openHistory: []
}>()
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
              <button
                class="fyrush-report-ring"
                type="button"
                :disabled="pending"
                @click="$emit('openSubmit')"
              >
                <span class="fyrush-report-core">
                  <UIcon
                    name="i-lucide-flame"
                    class="size-14 text-white"
                  />
                  <span class="text-2xl font-black tracking-tight leading-none">REPORT</span>
                  <span class="text-2xl font-black tracking-tight leading-none">FIRE</span>
                </span>
              </button>
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
          class="bg-(--fyrush-ink) text-white border-none"
        >
          <template #header>
            <h2 class="font-bold text-lg">
              Latest Incident
            </h2>
          </template>
          <p class="font-semibold capitalize">
            {{ latestIncident.status }}
          </p>
          <p class="text-sm text-white/85 mt-1">
            {{ latestIncident.address }}
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
