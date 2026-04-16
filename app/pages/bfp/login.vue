<script setup lang="ts">
await navigateTo('/citizen/auth')
</script>

<template>
  <UContainer class="py-10 max-w-lg">
    <UCard class="fyrush-panel">
      <template #header>
        <h1 class="text-2xl font-bold">
          BFP Login moved to Google Sign-In
        </h1>
      </template>

      <div class="space-y-4 text-sm">
        <p class="text-muted">
          BFP access now uses the same Google Sign-In page as citizens. The account that matches
          <span class="font-semibold">BFP_EMAIL</span> is assigned the BFP role automatically.
        </p>

        <UButton
          to="/citizen/auth"
          block
          color="warning"
        >
          Go to Google Sign-In
        </UButton>
      </div>
    </UCard>
  </UContainer>
</template>
