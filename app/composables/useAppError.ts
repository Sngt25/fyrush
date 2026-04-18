function cleanMessage(raw: string) {
  return raw
    .replace(/^\[[A-Z]+\]\s*["'][^"']+["']:\s*/u, '')
    .replace(/^FetchError:\s*/iu, '')
    .trim()
}

function pickFirstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0)
      return value
  }

  return ''
}

export function useAppError() {
  function toMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
    const payload = (error ?? {}) as {
      message?: unknown
      statusMessage?: unknown
      data?: {
        message?: unknown
        statusMessage?: unknown
        error?: unknown
      }
      response?: {
        _data?: {
          message?: unknown
          statusMessage?: unknown
          error?: unknown
        }
      }
    }

    const candidate = pickFirstString(
      payload.data?.statusMessage,
      payload.response?._data?.statusMessage,
      payload.statusMessage,
      payload.data?.message,
      payload.response?._data?.message,
      payload.message
    )

    const message = cleanMessage(candidate)

    if (!message)
      return fallback

    if (/networkerror|failed to fetch|load failed|network request failed/iu.test(message))
      return 'Network error. Please check your connection and try again.'

    return message
  }

  return {
    toMessage
  }
}
