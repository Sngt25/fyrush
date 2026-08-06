import type { IncidentFeedItem } from '#shared/fyrush'
import { INCIDENT_STATUS } from '#shared/fyrush'

const ALARM_SOUND_URL = '/sounds/fire-alarm.mp3'

/**
 * Looping fire-alarm sound that plays on the BFP side whenever a fire report is
 * received, and keeps looping until every NEW incident has been acknowledged
 * (validated, dispatched, completed or invalidated) by a responder.
 */
export function useIncidentAlarm() {
  const alarmingIds = useState<string[]>('fyrush-alarm-ids', () => [])

  let audio: HTMLAudioElement | null = null

  function getAudio() {
    if (!import.meta.client)
      return null

    if (!audio) {
      audio = new Audio(ALARM_SOUND_URL)
      audio.loop = true
      audio.preload = 'auto'
      audio.volume = 0.8
    }

    return audio
  }

  function syncPlayback() {
    const player = getAudio()
    if (!player)
      return

    if (alarmingIds.value.length > 0) {
      if (!player.paused)
        return

      player.play().catch(() => {
        // Autoplay may be blocked; the loop resumes once the user interacts.
      })
      return
    }

    player.pause()
    player.currentTime = 0
  }

  function startAlarm(incidentId: string) {
    if (!import.meta.client)
      return

    if (!alarmingIds.value.includes(incidentId))
      alarmingIds.value = [...alarmingIds.value, incidentId]

    syncPlayback()
  }

  function stopAlarm(incidentId: string) {
    if (!alarmingIds.value.includes(incidentId))
      return

    alarmingIds.value = alarmingIds.value.filter(id => id !== incidentId)
    syncPlayback()
  }

  function stopAll() {
    if (alarmingIds.value.length === 0)
      return

    alarmingIds.value = []
    syncPlayback()
  }

  function isAlarming() {
    return alarmingIds.value.length > 0
  }

  /**
   * Drives the alarm from the incident feed:
   * - starts the loop for incidents freshly reported (NEW) that weren't before
   * - stops the loop for incident ids once they leave the NEW state
   */
  function handleFeed(previous: IncidentFeedItem[], next: IncidentFeedItem[]) {
    const wasNew = new Set(previous.filter(i => i.status === INCIDENT_STATUS.NEW).map(i => i.id))
    const isNew = new Set(next.filter(i => i.status === INCIDENT_STATUS.NEW).map(i => i.id))

    for (const id of isNew) {
      if (!wasNew.has(id))
        startAlarm(id)
    }

    for (const id of [...alarmingIds.value]) {
      if (!isNew.has(id))
        stopAlarm(id)
    }
  }

  return {
    startAlarm,
    stopAlarm,
    stopAll,
    isAlarming,
    handleFeed
  }
}
