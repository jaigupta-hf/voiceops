import { useCallback, useEffect, useRef, useState } from 'react'
import { useCallWebSocket } from './useCallWebSocket'

export function useDashboardData({ apiBaseUrl, wsBaseUrl }) {
  const [callEvents, setCallEvents] = useState([])
  const [errorEvents, setErrorEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [callStats, setCallStats] = useState(null)
  const [errorStats, setErrorStats] = useState(null)

  const [callEventsNextPage, setCallEventsNextPage] = useState(null)
  const [errorEventsNextPage, setErrorEventsNextPage] = useState(null)
  const [loadingMoreCalls, setLoadingMoreCalls] = useState(false)
  const [loadingMoreErrors, setLoadingMoreErrors] = useState(false)
  const [showLoadMoreCalls, setShowLoadMoreCalls] = useState(false)
  const callEventsScrollRef = useRef(null)

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true)
    }

    try {
      const callQuery = 'page_size=100'
      const errorQuery = 'page_size=100'

      const [callsRes, errorsRes, callStatsRes, errorStatsRes] = await Promise.all([
        fetch(`${apiBaseUrl}/call-events/?${callQuery}`),
        fetch(`${apiBaseUrl}/error-events/?${errorQuery}`),
        fetch(`${apiBaseUrl}/call-events/stats/`),
        fetch(`${apiBaseUrl}/error-events/stats/`),
      ])

      const callsData = await callsRes.json()
      const errorsData = await errorsRes.json()
      const callStatsData = await callStatsRes.json()
      const errorStatsData = await errorStatsRes.json()

      setCallEvents(callsData.results || callsData)
      setErrorEvents(errorsData.results || errorsData)
      setCallStats(callStatsData)
      setErrorStats(errorStatsData)
      setCallEventsNextPage(callsData.next || null)
      setErrorEventsNextPage(errorsData.next || null)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }, [apiBaseUrl])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleIncomingCallEvent = useCallback((eventData) => {
    setCallEvents(prev => {
      const existingIndex = prev.findIndex(e => e.call_sid === eventData.call_sid)

      if (existingIndex !== -1) {
        const existingEvent = prev[existingIndex]
        const newTimestamp = new Date(eventData.timestamp)
        const existingTimestamp = new Date(existingEvent.timestamp)

        if (newTimestamp >= existingTimestamp) {
          const updated = [...prev]
          updated[existingIndex] = eventData
          return updated
        }

        return prev
      }

      return [eventData, ...prev].slice(0, 100)
    })
  }, [])

  const handleIncomingErrorEvent = useCallback((eventData) => {
    setErrorEvents(prev => {
      const exists = prev.some(e => e.event_id === eventData.event_id)
      if (exists) {
        return prev
      }
      return [eventData, ...prev].slice(0, 100)
    })

    if (eventData.severity) {
      setErrorStats(prev => {
        if (!prev?.by_severity) return prev
        const newStats = { ...prev }
        const severity = eventData.severity
        if (newStats.by_severity[severity] !== undefined) {
          newStats.by_severity[severity] += 1
        } else {
          newStats.by_severity[severity] = 1
        }
        return newStats
      })
    }
  }, [])

  const { isConnected: wsConnected } = useCallWebSocket(
    `${wsBaseUrl}/ws/events/`,
    handleIncomingCallEvent,
    handleIncomingErrorEvent,
  )

  useEffect(() => {
    if (callEventsScrollRef.current && callEventsNextPage) {
      const element = callEventsScrollRef.current
      const scrollThreshold = 100
      const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < scrollThreshold
      setShowLoadMoreCalls(isNearBottom)
    } else {
      setShowLoadMoreCalls(false)
    }
  }, [callEvents, callEventsNextPage])

  const loadMoreCallEvents = useCallback(async () => {
    if (!callEventsNextPage || loadingMoreCalls) return

    setLoadingMoreCalls(true)
    try {
      const response = await fetch(callEventsNextPage)
      const data = await response.json()

      setCallEvents(prev => [...prev, ...(data.results || [])])
      setCallEventsNextPage(data.next || null)
    } catch (error) {
      console.error('Error loading more call events:', error)
    } finally {
      setLoadingMoreCalls(false)
    }
  }, [callEventsNextPage, loadingMoreCalls])

  const handleCallEventsScroll = useCallback((e) => {
    const element = e.target
    const scrollThreshold = 100
    const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < scrollThreshold
    setShowLoadMoreCalls(isNearBottom && callEventsNextPage)
  }, [callEventsNextPage])

  const loadMoreErrorEvents = useCallback(async () => {
    if (!errorEventsNextPage || loadingMoreErrors) return

    setLoadingMoreErrors(true)
    try {
      const response = await fetch(errorEventsNextPage)
      const data = await response.json()

      setErrorEvents(prev => [...prev, ...(data.results || [])])
      setErrorEventsNextPage(data.next || null)
    } catch (error) {
      console.error('Error loading more error events:', error)
    } finally {
      setLoadingMoreErrors(false)
    }
  }, [errorEventsNextPage, loadingMoreErrors])

  return {
    callEvents,
    errorEvents,
    loading,
    callStats,
    errorStats,
    wsConnected,
    callEventsNextPage,
    errorEventsNextPage,
    loadingMoreCalls,
    loadingMoreErrors,
    showLoadMoreCalls,
    callEventsScrollRef,
    fetchData,
    loadMoreCallEvents,
    handleCallEventsScroll,
    loadMoreErrorEvents,
  }
}
