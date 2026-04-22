import { useEffect, useRef, useState } from 'react'

export function useCallWebSocket(url, onCallEvent, onErrorEvent) {
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef(null)
  const reconnectTimerRef = useRef(null)
  const onCallEventRef = useRef(onCallEvent)
  const onErrorEventRef = useRef(onErrorEvent)

  useEffect(() => {
    onCallEventRef.current = onCallEvent
    onErrorEventRef.current = onErrorEvent
  }, [onCallEvent, onErrorEvent])

  useEffect(() => {
    if (!url) return undefined

    let isMounted = true

    const connect = () => {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        if (!isMounted) return
        setIsConnected(true)
      }

      ws.onmessage = (event) => {
        if (!isMounted) return
        const message = JSON.parse(event.data)
        if (message.type === 'call_event') onCallEventRef.current?.(message.data)
        if (message.type === 'error_event') onErrorEventRef.current?.(message.data)
      }

      ws.onerror = () => {
        if (!isMounted) return
        setIsConnected(false)
      }

      ws.onclose = () => {
        if (!isMounted) return
        setIsConnected(false)
        reconnectTimerRef.current = setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      isMounted = false
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [url])

  return { isConnected }
}
