<script setup lang="ts">
interface HistoryItem {
  id: string
  status: string
  address: string
  createdAt: number
}

const props = withDefaults(defineProps<{
  history: HistoryItem[]
  desktop?: boolean
  pageSize?: number
}>(), {
  desktop: false,
  pageSize: 10
})

const page = ref(1)

const historyFormatter = new Intl.DateTimeFormat('en-PH', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
})

const totalPages = computed(() => {
  if (props.history.length === 0)
    return 1

  return Math.ceil(props.history.length / props.pageSize)
})

const pagedHistory = computed(() => {
  const start = (page.value - 1) * props.pageSize
  return props.history.slice(start, start + props.pageSize)
})

const paginationLabel = computed(() => {
  if (props.history.length === 0)
    return 'Page 0 of 0'

  return `Page ${page.value} of ${totalPages.value}`
})

watch(() => props.history.length, () => {
  if (page.value > totalPages.value)
    page.value = totalPages.value
})

function formatHistoryDate(timestamp: number) {
  return historyFormatter.format(new Date(timestamp))
}

function goToPreviousPage() {
  page.value = Math.max(1, page.value - 1)
}

function goToNextPage() {
  page.value = Math.min(totalPages.value, page.value + 1)
}
</script>

<template>
  <main :class="desktop ? 'flex-1 min-h-0 overflow-y-auto p-6' : 'flex-1 min-h-0 overflow-y-auto p-4'">
    <UCard class="fyrush-panel">
      <template #header>
        <div class="flex items-center justify-between gap-3">
          <h2 :class="desktop ? 'font-bold text-2xl' : 'font-bold text-xl'">
            Full History
          </h2>
          <UBadge
            color="neutral"
            variant="subtle"
          >
            {{ history.length }} total
          </UBadge>
        </div>
      </template>

      <div
        v-if="history.length > 0"
        class="space-y-3"
      >
        <ul class="space-y-2 text-sm">
          <li
            v-for="item in pagedHistory"
            :key="item.id"
            class="rounded-lg border border-default p-3"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 space-y-1">
                <p class="font-semibold capitalize">
                  {{ item.status }}
                </p>
                <p class="text-muted wrap-break-word">
                  {{ item.address }}
                </p>
              </div>
              <span class="text-xs text-muted whitespace-nowrap">
                {{ formatHistoryDate(item.createdAt) }}
              </span>
            </div>
          </li>
        </ul>

        <div class="flex items-center justify-between gap-2 pt-2">
          <UButton
            color="neutral"
            variant="outline"
            size="sm"
            icon="i-lucide-chevron-left"
            :disabled="page <= 1"
            @click="goToPreviousPage"
          >
            Previous
          </UButton>

          <p class="text-xs text-muted font-semibold">
            {{ paginationLabel }}
          </p>

          <UButton
            color="neutral"
            variant="outline"
            size="sm"
            trailing-icon="i-lucide-chevron-right"
            :disabled="page >= totalPages"
            @click="goToNextPage"
          >
            Next
          </UButton>
        </div>
      </div>

      <p
        v-else
        class="text-sm text-muted"
      >
        No incident history yet.
      </p>
    </UCard>
  </main>
</template>
