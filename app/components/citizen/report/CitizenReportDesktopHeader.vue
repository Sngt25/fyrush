<script setup lang="ts">
const props = withDefaults(defineProps<{
  showInstall?: boolean
}>(), {
  showInstall: false
})

defineEmits<{
  openLocationPrompt: []
  signOut: []
  installApp: []
}>()
</script>

<template>
  <header class="sticky top-0 z-20 bg-(--fyrush-ink) text-white px-6 py-4 border-b border-white/10">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-4xl leading-none font-black tracking-tight">
          Fyrush
        </p>
        <p class="text-sm text-white/70 mt-1">
          Citizen Reporting Dashboard
        </p>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          v-if="props.showInstall"
          color="neutral"
          variant="soft"
          icon="i-lucide-download"
          @click="$emit('installApp')"
        >
          Install App
        </UButton>
        <UButton
          color="neutral"
          variant="soft"
          icon="i-lucide-map-pin"
          @click="$emit('openLocationPrompt')"
        >
          Location Mode
        </UButton>
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-log-out"
          @click="$emit('signOut')"
        >
          Logout
        </UButton>
      </div>
    </div>
  </header>
</template>
