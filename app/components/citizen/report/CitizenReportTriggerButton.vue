<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'

const props = withDefaults(defineProps<{
  pending: boolean
  tapsRequired?: number
  resetDelayMs?: number
}>(), {
  tapsRequired: 3,
  resetDelayMs: 1200
})

const emit = defineEmits<{
  trigger: []
}>()

const tapCount = ref(0)

const tapsLeft = computed(() => Math.max(props.tapsRequired - tapCount.value, 0))

const resetTapCount = useDebounceFn(() => {
  tapCount.value = 0
}, props.resetDelayMs)

function onTap() {
  if (props.pending)
    return

  tapCount.value += 1

  if (tapCount.value >= props.tapsRequired) {
    tapCount.value = 0
    emit('trigger')
    return
  }

  resetTapCount()
}
</script>

<template>
  <button
    class="fyrush-report-ring"
    type="button"
    :disabled="pending"
    :aria-label="`Report fire, ${tapsLeft} taps remaining`"
    @click="onTap"
  >
    <svg
      class="fyrush-report-ring-text"
      viewBox="0 0 296 296"
      aria-hidden="true"
    >
      <defs>
        <path
          id="fyrush-ring-text-path"
          d="M148,148 m-104,0 a104,104 0 1,1 208,0 a104,104 0 1,1 -208,0"
        />
      </defs>
      <text>
        <textPath
          href="#fyrush-ring-text-path"
          startOffset="0"
        >3 TAP&nbsp;·&nbsp;3 TAP&nbsp;·&nbsp;3 TAP&nbsp;·&nbsp;3 TAP&nbsp;·&nbsp;3 TAP&nbsp;·&nbsp;3 TAP&nbsp;·&nbsp;3 TAP&nbsp;·&nbsp;3 TAP&nbsp;·&nbsp;3 TAP&nbsp;·&nbsp;</textPath>
      </text>
    </svg>
    <span class="fyrush-report-core">
      <UIcon
        name="i-lucide-flame"
        class="size-16 text-white"
      />
      <span class="text-3xl font-black tracking-tight leading-none">REPORT</span>
      <span class="text-3xl font-black tracking-tight leading-none">FIRE</span>
    </span>
  </button>
</template>
