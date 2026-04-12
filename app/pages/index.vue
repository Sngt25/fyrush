<template>
  <UContainer class="py-12 max-w-2xl space-y-8">
    <div class="text-center space-y-3">
      <h1 class="text-5xl font-black tracking-tight fyrush-title">
        Fyrush
      </h1>
      <p class="text-sm text-muted">
        Barangay Kalipay fire reporting and BFP response platform
      </p>
    </div>

    <UCard class="fyrush-panel">
      <div class="grid gap-3">
        <UButton
          to="/citizen/auth"
          size="xl"
          color="error"
          block
        >
          Citizen Login / Sign Up
        </UButton>
        <UButton
          to="/bfp/login"
          size="xl"
          color="warning"
          block
        >
          BFP Personnel Login
        </UButton>
      </div>
    </UCard>
  </UContainer>
</template>
