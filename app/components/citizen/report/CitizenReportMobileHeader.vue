<template>
  <header class="sticky top-0 z-20 bg-(--fyrush-ink) text-white px-4 py-3 border-b border-white/10">
    <div class="flex items-center justify-between">
      <p class="text-4xl leading-none font-black tracking-tight">
        Fyrush
      </p>
      <UButton
        color="neutral"
        variant="outline"
        icon="i-lucide-log-out"
        @click="$emit('signOut')"
      >
        Logout
      </UButton>
    </div>
  </header>
</template>
