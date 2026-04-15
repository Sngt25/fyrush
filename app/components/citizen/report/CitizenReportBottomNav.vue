<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const props = withDefaults(defineProps<{
  items: NavigationMenuItem[]
  desktop?: boolean
}>(), {
  desktop: false
})

const navUi = computed(() => {
  if (props.desktop) {
    return {
      list: 'w-full justify-center gap-2',
      link: 'rounded-full px-5 py-2 data-[state=active]:bg-red-50 data-[state=active]:text-red-700',
      linkLabel: 'text-sm font-semibold'
    }
  }

  return {
    list: 'w-full justify-around',
    link: 'flex-1 justify-center rounded-full px-3 py-2 data-[state=active]:bg-red-50 data-[state=active]:text-red-700',
    linkLabel: 'text-xs font-semibold'
  }
})
</script>

<template>
  <UNavigationMenu
    :items="items"
    :class="desktop ? 'w-full justify-center' : 'w-full justify-around'"
    :ui="navUi"
  />
</template>
