export function formatTimestamp(timestamp, timezone = 'IST') {
  const date = new Date(timestamp)

  if (timezone === 'UTC') {
    const utcString = date.toISOString()
    const dateStr = utcString.split('T')[0]
    const timeStr = utcString.split('T')[1].split('.')[0]
    return `${dateStr} ${timeStr} UTC`
  }

  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  today.setHours(0, 0, 0, 0)
  yesterday.setHours(0, 0, 0, 0)
  const compareDate = new Date(date)
  compareDate.setHours(0, 0, 0, 0)

  const timeString = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })

  if (compareDate.getTime() === today.getTime()) {
    return `Today ${timeString}`
  }

  if (compareDate.getTime() === yesterday.getTime()) {
    return `Yesterday ${timeString}`
  }

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}

export function getDateRangeForQuickFilter(range) {
  const now = new Date()

  const formatLocalDate = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const todayStr = formatLocalDate(now)
  let dateFrom
  let dateTo

  switch (range) {
    case 'all':
      return { dateFrom: '', dateTo: '' }
    case 'today':
      dateFrom = todayStr
      dateTo = todayStr
      break
    case 'last-1-hour':
      dateFrom = formatLocalDate(new Date(now.getTime() - 60 * 60 * 1000))
      dateTo = todayStr
      break
    case 'last-1-week':
      dateFrom = formatLocalDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000))
      dateTo = todayStr
      break
    case 'this-month':
      dateFrom = formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 1))
      dateTo = todayStr
      break
    case 'last-month': {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
      dateFrom = formatLocalDate(lastMonth)
      dateTo = formatLocalDate(lastMonthEnd)
      break
    }
    case 'custom':
    default:
      return { dateFrom: '', dateTo: '' }
  }

  return { dateFrom, dateTo }
}

export function formatEventType(eventType) {
  if (!eventType) return 'N/A'
  return eventType.replace('com.twilio.voice.', '')
}
