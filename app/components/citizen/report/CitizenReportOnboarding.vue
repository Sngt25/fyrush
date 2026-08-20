<script setup lang="ts">
type StepTarget = 'location' | 'report' | 'status' | 'duplicate' | 'profile' | null

interface Step {
  title: string
  icon: string
  target: StepTarget
  body: string
}

const emit = defineEmits<{
  done: []
}>()

const steps: Step[] = [
  {
    title: 'Report a Fire — Quick Instructions',
    icon: 'i-lucide-hand-heart',
    target: null,
    body: 'This quick tour shows how to report a fire from start to finish. Tap Next to go through each step.'
  },
  {
    title: 'Choose your location',
    icon: 'i-lucide-map-pinned',
    target: 'location',
    body: 'Tap Pin Location for fires outside your address, or Yes, Use Set Location to auto-use your saved address.'
  },
  {
    title: 'Send the report',
    icon: 'i-lucide-flame',
    target: 'report',
    body: 'When you are sure of the fire, tap the CIRCLE icon 3 TIMES quickly to send your alert.'
  },
  {
    title: 'Wait for status updates',
    icon: 'i-lucide-bell-ring',
    target: 'status',
    body: 'You will get notifications as your report moves through: New (sent) → Validated (confirmed) → Respond (BFP on the move) → Completed (resolved).'
  },
  {
    title: 'Avoid duplicate reports',
    icon: 'i-lucide-triangle-alert',
    target: 'duplicate',
    body: 'If you report the same fire twice, you will see "Already Reported." Only send once per incident.'
  },
  {
    title: 'Keep your address current',
    icon: 'i-lucide-user-round',
    target: 'profile',
    body: 'Your saved address is tied to "Use set location." Update it in your profile whenever your address changes.'
  },
  {
    title: 'You\'re all set',
    icon: 'i-lucide-shield-check',
    target: null,
    body: 'Stay safe and stay alert. Tap Get Started to open the app.'
  }
]

const open = ref(true)
const stepIndex = ref(0)

const current = computed<Step>(() => steps[stepIndex.value]!)
const isFirst = computed(() => stepIndex.value === 0)
const isLast = computed(() => stepIndex.value === steps.length - 1)

function spotlight(target: StepTarget) {
  const currentTarget = current.value.target
  if (!currentTarget)
    return ''
  return currentTarget === target ? 'onboarding-target' : 'onboarding-dim'
}

function next() {
  if (isLast.value) {
    finish()
    return
  }
  stepIndex.value += 1
}

function back() {
  stepIndex.value = Math.max(0, stepIndex.value - 1)
}

function finish() {
  open.value = false
  emit('done')
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 overflow-y-auto bg-(--fyrush-ink)/85 backdrop-blur-sm"
    >
      <div class="flex min-h-full flex-col items-center justify-center gap-6 p-6">
        <div class="pointer-events-none relative w-72 shrink-0 overflow-hidden rounded-[2.2rem] border-[6px] border-(--fyrush-ink) bg-white shadow-2xl">
          <div class="flex items-center justify-between bg-(--fyrush-ink) px-4 py-3 text-white">
            <p class="text-xl leading-none font-black tracking-tight">
              Fyrush
            </p>
            <div class="flex items-center gap-1.5">
              <div class="size-2.5 rounded-full bg-white/25" />
              <div class="size-2.5 rounded-full bg-white/25" />
            </div>
          </div>

          <div class="space-y-4 p-4">
            <div :class="['fyrush-location-card rounded-2xl px-4 py-3 transition-opacity', spotlight('profile')]">
              <div class="flex items-start gap-2.5">
                <UIcon
                  name="i-lucide-map-pin"
                  class="size-5 mt-0.5 text-(--fyrush-ink)"
                />
                <div>
                  <p class="font-extrabold text-sm leading-tight text-(--fyrush-ink)">
                    Location: Your set location
                  </p>
                  <p class="text-xs text-(--fyrush-ink)/85">
                    (123.45678, 456.12345)
                  </p>
                </div>
              </div>
            </div>

            <div :class="['flex justify-center pt-1 transition-opacity', spotlight('report')]">
              <div
                class="grid place-items-center rounded-full"
                style="width: 8rem; height: 8rem; background: radial-gradient(circle at center, rgb(255 255 255 / 75%) 0, rgb(255 255 255 / 0%) 56%), radial-gradient(circle at center, rgb(216 31 42 / 18%) 35%, rgb(216 31 42 / 0%) 72%);"
              >
                <div
                  class="flex flex-col items-center justify-center gap-1 rounded-full border-[3px] border-[#f6bcc0] text-white"
                  style="width: 7rem; height: 7rem; background: linear-gradient(180deg, #e4242d 0, #ca151e 100%); box-shadow: 0 8px 14px rgb(126 8 14 / 32%), inset 0 -5px 9px rgb(76 0 8 / 18%);"
                >
                  <UIcon
                    name="i-lucide-flame"
                    class="size-6 text-white"
                  />
                  <span class="text-[10px] font-black tracking-tight leading-none">REPORT</span>
                  <span class="text-[10px] font-black tracking-tight leading-none">FIRE</span>
                </div>
              </div>
            </div>

            <p :class="['text-center text-xs font-bold text-(--fyrush-ink) transition-opacity', spotlight('report')]">
              Tap 3 TIMES to send Alert
            </p>

            <div :class="['flex flex-wrap items-center justify-center gap-1 transition-opacity', spotlight('status')]">
              <span class="rounded-md bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700">New</span>
              <UIcon
                name="i-lucide-arrow-right"
                class="size-3 text-slate-300"
              />
              <span class="rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">Validated</span>
              <UIcon
                name="i-lucide-arrow-right"
                class="size-3 text-slate-300"
              />
              <span class="rounded-md bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700">Respond</span>
              <UIcon
                name="i-lucide-arrow-right"
                class="size-3 text-slate-300"
              />
              <span class="rounded-md bg-green-100 px-1.5 py-0.5 text-[9px] font-bold text-green-700">Completed</span>
            </div>

            <div :class="['flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 transition-opacity', spotlight('duplicate')]">
              <UIcon
                name="i-lucide-triangle-alert"
                class="size-3.5 text-amber-600"
              />
              <p class="text-[10px] font-semibold text-amber-700">
                Already Reported
              </p>
            </div>

            <div :class="['flex items-center justify-between transition-opacity', spotlight('location')]">
              <p class="text-sm font-bold text-(--fyrush-ink)">
                History Log
              </p>
              <div class="flex gap-1.5">
                <div class="flex items-center gap-1 rounded-md bg-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-700">
                  <UIcon
                    name="i-lucide-map"
                    class="size-3"
                  />
                  Location
                </div>
                <div class="flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-[10px] font-semibold text-slate-700">
                  <UIcon
                    name="i-lucide-map-pinned"
                    class="size-3"
                  />
                  Map
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="w-full max-w-sm space-y-4 rounded-3xl bg-white p-6 shadow-2xl">
          <div class="flex items-start gap-3">
            <div class="grid size-11 shrink-0 place-items-center rounded-2xl bg-(--fyrush-danger)/10 text-(--fyrush-danger)">
              <UIcon
                :name="current.icon"
                class="size-6"
              />
            </div>
            <div class="space-y-1">
              <h2 class="text-lg font-extrabold leading-tight text-(--fyrush-ink)">
                {{ current.title }}
              </h2>
              <p class="text-sm leading-relaxed text-muted">
                {{ current.body }}
              </p>
            </div>
          </div>

          <div class="flex items-center justify-between gap-3">
            <UButton
              v-if="!isFirst"
              color="neutral"
              variant="ghost"
              icon="i-lucide-arrow-left"
              @click="back"
            >
              Back
            </UButton>
            <UButton
              v-else
              color="neutral"
              variant="ghost"
              @click="finish"
            >
              Skip
            </UButton>

            <div class="flex items-center gap-1.5">
              <span
                v-for="(step, index) in steps"
                :key="index"
                class="h-1.5 rounded-full transition-all"
                :class="index === stepIndex ? 'w-6 bg-(--fyrush-danger)' : 'w-1.5 bg-slate-300'"
              />
            </div>

            <UButton
              color="error"
              :trailing-icon="isLast ? undefined : 'i-lucide-arrow-right'"
              :icon="isLast ? 'i-lucide-check' : undefined"
              @click="next"
            >
              {{ isLast ? 'Get Started' : 'Next' }}
            </UButton>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
