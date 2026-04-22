import { useCallback, useRef, useState } from 'react'
import { toPng } from 'html-to-image'

export function useDashboardTimeline({ apiBaseUrl }) {
  const timelineRef = useRef(null)
  const [copiedId, setCopiedId] = useState(null)
  const [selectedCallSid, setSelectedCallSid] = useState(null)
  const [callTimeline, setCallTimeline] = useState(null)
  const [conferenceTimeline, setConferenceTimeline] = useState(null)
  const [loadingTimeline, setLoadingTimeline] = useState(false)
  const [selectedPayload, setSelectedPayload] = useState(null)

  const copyToClipboard = useCallback((text) => {
    navigator.clipboard.writeText(text)
    setCopiedId(text)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const copyPayloadToClipboard = useCallback(() => {
    const jsonString = JSON.stringify(selectedPayload, null, 2)
    navigator.clipboard.writeText(jsonString)
    setCopiedId('payload')
    setTimeout(() => setCopiedId(null), 2000)
  }, [selectedPayload])

  const downloadPayload = useCallback(() => {
    const jsonString = JSON.stringify(selectedPayload, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `event-payload-${Date.now()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [selectedPayload])

  const fetchConferenceTimeline = useCallback(async (conferenceSid) => {
    try {
      const response = await fetch(`${apiBaseUrl}/call-events/conference-trace/${conferenceSid}/`)

      if (response.ok) {
        const data = await response.json()
        setConferenceTimeline(data)
      } else {
        console.error('Error fetching conference trace:', response.statusText)
        setConferenceTimeline(null)
      }
    } catch (error) {
      console.error('Error fetching conference timeline:', error)
      setConferenceTimeline(null)
    }
  }, [apiBaseUrl])

  const fetchCallTimeline = useCallback(async (callSid) => {
    setLoadingTimeline(true)
    setSelectedCallSid(callSid)
    setConferenceTimeline(null)

    try {
      const response = await fetch(`${apiBaseUrl}/call-events/call-trace/${callSid}/`)

      if (response.ok) {
        const data = await response.json()
        setCallTimeline(data)

        let conferenceSid = null
        if (data && data.events) {
          for (const event of data.events) {
            if (event.details && event.details.conference_sid && event.details.conference_sid !== 'N/A') {
              conferenceSid = event.details.conference_sid
              break
            }
          }
        }

        if (conferenceSid) {
          await fetchConferenceTimeline(conferenceSid)
        }
      } else {
        console.error('Error fetching call trace:', response.statusText)
        setCallTimeline(null)
      }
    } catch (error) {
      console.error('Error fetching call timeline:', error)
      setCallTimeline(null)
    } finally {
      setLoadingTimeline(false)
    }
  }, [apiBaseUrl, fetchConferenceTimeline])

  const closeTimeline = useCallback(() => {
    setSelectedCallSid(null)
    setCallTimeline(null)
    setConferenceTimeline(null)
    setSelectedPayload(null)
  }, [])

  const saveTimelineAsImage = useCallback(async () => {
    if (!timelineRef.current) return

    try {
      const dataUrl = await toPng(timelineRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        style: {
          overflow: 'visible',
          maxHeight: 'none',
        },
      })

      const link = document.createElement('a')
      link.download = `${callTimeline?.header?.call_sid || 'timeline'}.png`
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error('Error saving timeline:', error)
    }
  }, [callTimeline])

  return {
    timelineRef,
    copiedId,
    selectedCallSid,
    callTimeline,
    conferenceTimeline,
    loadingTimeline,
    selectedPayload,
    setSelectedPayload,
    copyToClipboard,
    copyPayloadToClipboard,
    downloadPayload,
    fetchCallTimeline,
    closeTimeline,
    saveTimelineAsImage,
  }
}
