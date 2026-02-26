import { useState, useEffect, useRef } from 'react'
import { Phone, AlertCircle, RefreshCw, Copy, Check, X, Filter, CheckCircle, Clock, Download } from 'lucide-react'
import { toPng } from 'html-to-image'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000'

function App() {
  const [callEvents, setCallEvents] = useState([])
  const [errorEvents, setErrorEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [callStats, setCallStats] = useState(null)
  const [errorStats, setErrorStats] = useState(null)
  const [wsConnected, setWsConnected] = useState(false)
  const wsRef = useRef(null)
  const timelineRef = useRef(null)
  
  // Filter states
  const [selectedAccountSid, setSelectedAccountSid] = useState('all')
  const [callDateRange, setCallDateRange] = useState('all')
  const [errorDateRange, setErrorDateRange] = useState('all')
  const [callFilters, setCallFilters] = useState({
    dateFrom: '',
    dateTo: '',
    direction: 'all',
    eventType: 'all',
    callStatus: 'all',
    fromNumber: '',
    toNumber: ''
  })
  const [appliedCallFilters, setAppliedCallFilters] = useState({
    dateFrom: '',
    dateTo: '',
    direction: 'all',
    eventType: 'all',
    callStatus: 'all',
    fromNumber: '',
    toNumber: ''
  })
  const [errorFilters, setErrorFilters] = useState({
    severity: 'all',
    errorCode: 'all',
    dateFrom: '',
    dateTo: ''
  })
  const [appliedErrorFilters, setAppliedErrorFilters] = useState({
    severity: 'all',
    errorCode: 'all',
    dateFrom: '',
    dateTo: ''
  })
  const [copiedId, setCopiedId] = useState(null)
  const [selectedCallSid, setSelectedCallSid] = useState(null)
  const [callTimeline, setCallTimeline] = useState(null)
  const [conferenceTimeline, setConferenceTimeline] = useState(null)
  const [loadingTimeline, setLoadingTimeline] = useState(false)
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all')
  const [callSidSearch, setCallSidSearch] = useState('')
  const [selectedPayload, setSelectedPayload] = useState(null)

  const getDateRangeForQuickFilter = (range) => {
    const now = new Date()
    
    // Helper to format date as YYYY-MM-DD in local timezone
    const formatLocalDate = (date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    
    const todayStr = formatLocalDate(now)
    let dateFrom, dateTo

    switch(range) {
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
      case 'last-month':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
        dateFrom = formatLocalDate(lastMonth)
        dateTo = formatLocalDate(lastMonthEnd)
        break
      case 'custom':
      default:
        return { dateFrom: '', dateTo: '' }
    }

    return { dateFrom, dateTo }
  }

  const handleCallDateRangeChange = (range) => {
    setCallDateRange(range)
    if (range !== 'custom') {
      const { dateFrom, dateTo } = getDateRangeForQuickFilter(range)
      setCallFilters({...callFilters, dateFrom, dateTo})
    }
  }

  const handleErrorDateRangeChange = (range) => {
    setErrorDateRange(range)
    if (range !== 'custom') {
      const { dateFrom, dateTo } = getDateRangeForQuickFilter(range)
      setErrorFilters({...errorFilters, dateFrom, dateTo})
    }
  }

  const fetchData = async (silent = false, forceNoPagination = false) => {
    if (!silent) {
      setLoading(true)
    }
    try {
      // Build query parameters - use no_pagination when explicitly requested or when filters would result in limited results
      let callQuery = forceNoPagination ? 'no_pagination=true' : 'page_size=100'
      let errorQuery = forceNoPagination ? 'no_pagination=true' : 'page_size=100'

      const [callsRes, errorsRes, callStatsRes, errorStatsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/call-events/?${callQuery}`),
        fetch(`${API_BASE_URL}/error-events/?${errorQuery}`),
        fetch(`${API_BASE_URL}/call-events/stats/`),
        fetch(`${API_BASE_URL}/error-events/stats/`)
      ])

      const callsData = await callsRes.json()
      const errorsData = await errorsRes.json()
      const callStatsData = await callStatsRes.json()
      const errorStatsData = await errorStatsRes.json()

      setCallEvents(callsData.results || callsData)
      setErrorEvents(errorsData.results || errorsData)
      setCallStats(callStatsData)
      setErrorStats(errorStatsData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    fetchData()
    
    // Setup WebSocket connection
    const connectWebSocket = () => {
      const ws = new WebSocket(`${WS_BASE_URL}/ws/events/`)
      
      ws.onopen = () => {
        console.log('WebSocket connected')
        setWsConnected(true)
      }
      
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data)
        console.log('WebSocket message:', message)
        
        if (message.type === 'call_event') {
          setCallEvents(prev => {
            // Check if we already have an event for this call_sid
            const existingIndex = prev.findIndex(e => e.call_sid === message.data.call_sid)
            
            if (existingIndex !== -1) {
              // Update existing call with latest event data if this event is newer
              const existingEvent = prev[existingIndex]
              const newTimestamp = new Date(message.data.timestamp)
              const existingTimestamp = new Date(existingEvent.timestamp)
              
              if (newTimestamp >= existingTimestamp) {
                // Replace with newer event
                const updated = [...prev]
                updated[existingIndex] = message.data
                return updated
              }
              // Keep existing if it's newer
              return prev
            }
            
            // Add new call event for new call_sid
            return [message.data, ...prev].slice(0, 100)
          })
        } else if (message.type === 'error_event') {
          setErrorEvents(prev => {
            // Check if event already exists to prevent duplicates
            const exists = prev.some(e => e.event_id === message.data.event_id)
            if (exists) {
              console.log('Error event already exists, skipping duplicate')
              return prev
            }
            return [message.data, ...prev].slice(0, 100)
          })
          // Update error stats
          if (message.data.severity) {
            setErrorStats(prev => {
              if (!prev?.by_severity) return prev
              const newStats = { ...prev }
              const severity = message.data.severity
              if (newStats.by_severity[severity] !== undefined) {
                newStats.by_severity[severity]++
              } else {
                newStats.by_severity[severity] = 1
              }
              return newStats
            })
          }
        }
      }
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setWsConnected(false)
      }
      
      ws.onclose = () => {
        console.log('WebSocket disconnected')
        setWsConnected(false)
        // Reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000)
      }
      
      wsRef.current = ws
    }
    
    connectWebSocket()
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    // Reset hours for comparison
    today.setHours(0, 0, 0, 0)
    yesterday.setHours(0, 0, 0, 0)
    const compareDate = new Date(date)
    compareDate.setHours(0, 0, 0, 0)
    
    const timeString = date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: true 
    })
    
    if (compareDate.getTime() === today.getTime()) {
      return `Today ${timeString}`
    } else if (compareDate.getTime() === yesterday.getTime()) {
      return `Yesterday ${timeString}`
    } else {
      return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      })
    }
  }

  // Hardcoded Twilio event type categories
  const eventTypeCategories = {
    'status-callback': {
      label: 'Status Callback',
      types: [
        'com.twilio.voice.status-callback.call.initiated',
        'com.twilio.voice.status-callback.call.ringing',
        'com.twilio.voice.status-callback.call.answered',
        'com.twilio.voice.status-callback.call.completed',
        'com.twilio.voice.status-callback.conference.updated',
        'com.twilio.voice.status-callback.conference-participant.updated'
      ]
    },
    'api-request': {
      label: 'API Request',
      types: [
        'com.twilio.voice.api-request.call.created',
        'com.twilio.voice.api-request.call.modified',
        'com.twilio.voice.api-request.conference.modified',
        'com.twilio.voice.api-request.conference-participant.created',
        'com.twilio.voice.api-request.conference-participant.modified',
        'com.twilio.voice.api-request.conference-participant.deleted'
      ]
    },
    'twiml': {
      label: 'TwiML',
      types: [
        'com.twilio.voice.twiml.call.redirected',
        'com.twilio.voice.twiml.call.requested',
        'com.twilio.voice.twiml.call.transferred'
      ]
    }
  }

  // Function to format event type - remove com.twilio.voice prefix
  const formatEventType = (eventType) => {
    if (!eventType) return 'N/A'
    return eventType.replace('com.twilio.voice.', '')
  }

  const getCallStatusColor = (status) => {
    const statusMap = {
      'queued': 'bg-gray-50 text-gray-700 border-gray-200',
      'initiated': 'bg-blue-50 text-blue-700 border-blue-200',
      'ringing': 'bg-amber-50 text-amber-700 border-amber-200',
      'busy': 'bg-indigo-50 text-indigo-700 border-indigo-200',
      'completed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'in-progress': 'bg-cyan-50 text-cyan-700 border-cyan-200',
      'no-answer': 'bg-rose-50 text-rose-700 border-rose-200',
      'canceled': 'bg-slate-50 text-slate-700 border-slate-200',
      'failed': 'bg-red-50 text-red-700 border-red-200',
      'conference-start': 'bg-blue-50 text-blue-700 border-blue-200',
      'conference-end': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'participant-join': 'bg-cyan-50 text-cyan-700 border-cyan-200',
      'participant-leave': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    }
    return statusMap[status?.toLowerCase()] || 'bg-gray-50 text-gray-700 border-gray-200'
  }

  const getSeverityColor = (severity) => {
    const colors = {
      ERROR: 'bg-red-50 text-red-700 border-red-200',
      WARNING: 'bg-amber-50 text-amber-700 border-amber-200',
      INFO: 'bg-blue-50 text-blue-700 border-blue-200',
    }
    return colors[severity] || 'bg-gray-50 text-gray-700 border-gray-200'
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopiedId(text)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const getCallStatusIcon = (event) => {
    // Check if there are any errors associated with this call_sid
    const hasError = errorEvents.some(error => error.correlation_sid === event.call_sid)
    
    if (hasError) {
      // Error takes priority - show attention icon
      return <AlertCircle className="w-5 h-5 text-red-500" />
    }
    
    if (event.event_type && event.event_type.includes('status-callback.call.completed')) {
      // Call completed successfully
      return <CheckCircle className="w-5 h-5 text-green-500" />
    }
    
    // Call is ongoing
    return <Clock className="w-5 h-5 text-blue-500" />
  }

  const clearCallFilters = () => {
    const defaultFilters = {
      dateFrom: '',
      dateTo: '',
      direction: 'all',
      eventType: 'all',
      callStatus: 'all',
      fromNumber: '',
      toNumber: ''
    }
    setCallDateRange('all')
    setCallFilters(defaultFilters)
    setAppliedCallFilters(defaultFilters)
    fetchData(true, false) // Use pagination when no filters
  }

  const applyCallFilters = () => {
    setAppliedCallFilters(callFilters)
    // Check if any meaningful filters are applied
    const hasFilters = callFilters.dateFrom || callFilters.dateTo || 
                       callFilters.direction !== 'all' || callFilters.eventType !== 'all' ||
                       callFilters.callStatus !== 'all' || callFilters.fromNumber || callFilters.toNumber
    fetchData(true, hasFilters) // No pagination when filters applied
  }

  const clearErrorFilters = () => {
    setErrorDateRange('all')
    const defaultFilters = {
      severity: 'all',
      errorCode: 'all',
      dateFrom: '',
      dateTo: ''
    }
    setErrorFilters(defaultFilters)
    setAppliedErrorFilters(defaultFilters)
  }

  const applyErrorFilters = () => {
    setAppliedErrorFilters(errorFilters)
  }

  const fetchCallTimeline = async (callSid) => {
    setLoadingTimeline(true)
    setSelectedCallSid(callSid)
    setConferenceTimeline(null) // Reset conference timeline
    try {
      // Fetch structured call trace from backend
      const response = await fetch(`${API_BASE_URL}/call-events/call-trace/${callSid}/`)
      
      if (response.ok) {
        const data = await response.json()
        setCallTimeline(data)
        
        // Check if any event has a conference_sid
        let conferenceSid = null
        if (data && data.events) {
          for (const event of data.events) {
            if (event.details && event.details.conference_sid && event.details.conference_sid !== 'N/A') {
              conferenceSid = event.details.conference_sid
              break
            }
          }
        }
        
        // If conference_sid found, fetch conference trace
        if (conferenceSid) {
          fetchConferenceTimeline(conferenceSid)
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
  }

  const fetchConferenceTimeline = async (conferenceSid) => {
    try {
      const response = await fetch(`${API_BASE_URL}/call-events/conference-trace/${conferenceSid}/`)
      
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
  }

  const closeTimeline = () => {
    setSelectedCallSid(null)
    setCallTimeline(null)
    setConferenceTimeline(null)
    setSelectedPayload(null)
  }

  const saveTimelineAsImage = async () => {
    if (!timelineRef.current) return
    
    try {
      const dataUrl = await toPng(timelineRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        style: {
          overflow: 'visible',
          maxHeight: 'none'
        }
      })
      
      const link = document.createElement('a')
      link.download = `${callTimeline?.header?.call_sid || 'timeline'}.png`
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error('Error saving timeline:', error)
    }
  }

  const renderEventDetails = (event) => {
    const details = event.details || {}
    
    // Special rendering for error events
    if (event.category === 'error') {
      return (
        <div className="space-y-2">
          {/* Pills for severity, error_code, product */}
          <div className="flex gap-2 flex-wrap">
            {details.severity && (
              <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getSeverityColor(details.severity)}`}>
                {details.severity}
              </span>
            )}
            {details.error_code && (
              <span className="px-2.5 py-1 text-xs font-medium rounded-full border border-gray-200 bg-gray-50 text-gray-700">
                {details.error_code}
              </span>
            )}
            {details.product && (
              <span className="px-2.5 py-1 text-xs font-medium rounded-full border border-orange-200 bg-orange-50 text-orange-700">
                {details.product}
              </span>
            )}
          </div>
          {/* Error message without heading */}
          {details.error_message && (
            <p className="text-sm text-gray-900">{details.error_message}</p>
          )}
        </div>
      )
    }
    
    // Special rendering for status-callback.call events
    if (event.event_type && event.event_type.includes('status-callback.call')) {
      return (
        <div className="flex gap-2 flex-wrap">
          {details.call_status && (
            <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getCallStatusColor(details.call_status)}`}>
              {details.call_status}
            </span>
          )}
        </div>
      )
    }
    
    // Special rendering for twiml.call events, border-indigo-300 bg-indigo-50 text-indigo-800
    if (event.event_type && event.event_type.includes('twiml.call')) {
      return (
        <div className="flex gap-2 flex-wrap">
          {details.status && (
            <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getCallStatusColor(details.status)}`}>
              {details.status}
            </span>
          )}
          {details.url && (
            <span className="px-2.5 py-1 text-xs font-medium rounded-full border bg-slate-50 text-slate-700 border-slate-200"> 
              {details.url}
            </span>
          )}
        </div>
      )
    }
    
    // Special rendering for status-callback.conference.participant events
    if (event.event_type && event.event_type.includes('status-callback.conference.participant')) {
      // Extract boolean fields for special rendering
      const booleanFields = ['hold', 'muted', 'coaching']
      const excludedFields = ['conference_sid', 'friendly_name', 'status', 'call_sid']
      const otherFields = Object.entries(details).filter(([key]) => !booleanFields.includes(key) && !excludedFields.includes(key))
      
      return (
        <div className="space-y-2 text-sm">
          {/* Status and Call SID pills */}
          <div className="flex gap-2 flex-wrap">
            {details.status && (
              <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getCallStatusColor(details.status)}`}>
                {details.status}
              </span>
            )}
            {details.call_sid && details.call_sid !== 'N/A' && (
              <span className="px-2.5 py-1 text-xs font-medium rounded-full border border-purple-200 bg-purple-50 text-purple-700">
                {details.call_sid}
              </span>
            )}
          </div>
          {/* Render other fields normally */}
          {otherFields.map(([key, value]) => {
            if (!value || value === 'N/A') return null
            
            const formattedKey = key
              .split('_')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')
            
            return (
              <div key={key} className="flex gap-2">
                <span className="font-medium text-gray-700">{formattedKey}:</span>
                <span className="text-gray-900">{value.toString()}</span>
              </div>
            )
          })}
          
          {/* Render boolean fields (hold, muted, coaching) with checkmarks/crosses */}
          {(details.hold !== undefined || details.muted !== undefined || details.coaching !== undefined) && (
            <div className="flex gap-4 items-center">
              {details.hold !== undefined && (
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-gray-700">Hold:</span>
                  <span className={`text-sm ${details.hold === 'true' || details.hold === true ? 'text-green-600' : 'text-red-600'}`}>
                    {details.hold === 'true' || details.hold === true ? '✓' : '✗'}
                  </span>
                </div>
              )}
              {details.muted !== undefined && (
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-gray-700">Muted:</span>
                  <span className={`text-sm ${details.muted === 'true' || details.muted === true ? 'text-green-600' : 'text-red-600'}`}>
                    {details.muted === 'true' || details.muted === true ? '✓' : '✗'}
                  </span>
                </div>
              )}
              {details.coaching !== undefined && (
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-gray-700">Coaching:</span>
                  <span className={`text-sm ${details.coaching === 'true' || details.coaching === true ? 'text-green-600' : 'text-red-600'}`}>
                    {details.coaching === 'true' || details.coaching === true ? '✓' : '✗'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )
    }
    
    // Special rendering for status-callback.conference events (not participant)
    if (event.event_type && event.event_type.includes('status-callback.conference') && !event.event_type.includes('participant')) {
      // Exclude conference_sid and friendly_name
      const excludedFields = ['conference_sid', 'friendly_name', 'status']
      const filteredFields = Object.entries(details).filter(([key]) => !excludedFields.includes(key))
      
      return (
        <div className="space-y-2 text-sm">
          {/* Status pill */}
          {details.status && (
            <div className="flex gap-2 flex-wrap">
              <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getCallStatusColor(details.status)}`}>
                {details.status}
              </span>
            </div>
          )}
          {filteredFields.map(([key, value]) => {
            if (!value || value === 'N/A') return null
            
            const formattedKey = key
              .split('_')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')
            
            return (
              <div key={key} className="flex gap-2">
                <span className="font-medium text-gray-700">{formattedKey}:</span>
                <span className="text-gray-900">{value.toString()}</span>
              </div>
            )
          })}
        </div>
      )
    }
    
    // Special rendering for api-request.conference-participant events (created, modified, deleted)
    if (event.event_type && event.event_type.includes('api-request.conference-participant')) {
      // Extract boolean fields for special rendering
      const booleanFields = ['hold', 'muted', 'coaching']
      const excludedFields = ['status']
      const otherFields = Object.entries(details).filter(([key]) => !booleanFields.includes(key) && !excludedFields.includes(key))
      
      return (
        <div className="space-y-2 text-sm">
          {/* Status pill */}
          {details.status && (
            <div className="flex gap-2 flex-wrap">
              <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getCallStatusColor(details.status)}`}>
                {details.status}
              </span>
            </div>
          )}
          {/* Render other fields normally */}
          {otherFields.map(([key, value]) => {
            if (!value || value === 'N/A') return null
            
            const formattedKey = key
              .split('_')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')
            
            return (
              <div key={key} className="flex gap-2">
                <span className="font-medium text-gray-700">{formattedKey}:</span>
                <span className="text-gray-900">{value.toString()}</span>
              </div>
            )
          })}
          
          {/* Render boolean fields (hold, muted, coaching) with checkmarks/crosses */}
          {(details.hold !== undefined || details.muted !== undefined || details.coaching !== undefined) && (
            <div className="flex gap-4 items-center">
              {details.hold !== undefined && (
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-gray-700">Hold:</span>
                  <span className={`text-sm ${details.hold === 'true' || details.hold === true ? 'text-green-600' : 'text-red-600'}`}>
                    {details.hold === 'true' || details.hold === true ? '✓' : '✗'}
                  </span>
                </div>
              )}
              {details.muted !== undefined && (
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-gray-700">Muted:</span>
                  <span className={`text-sm ${details.muted === 'true' || details.muted === true ? 'text-green-600' : 'text-red-600'}`}>
                    {details.muted === 'true' || details.muted === true ? '✓' : '✗'}
                  </span>
                </div>
              )}
              {details.coaching !== undefined && (
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-gray-700">Coaching:</span>
                  <span className={`text-sm ${details.coaching === 'true' || details.coaching === true ? 'text-green-600' : 'text-red-600'}`}>
                    {details.coaching === 'true' || details.coaching === true ? '✓' : '✗'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )
    }
    
    // Default rendering for other event types
    return (
      <div className="space-y-2 text-sm">
        {Object.entries(details).map(([key, value]) => {
          if (!value || value === 'N/A') return null
          
          // Format the key for display
          const formattedKey = key
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
          
          return (
            <div key={key} className="flex gap-2">
              <span className="font-medium text-gray-700">{formattedKey}:</span>
              <span className="text-gray-900">{value.toString()}</span>
            </div>
          )
        })}
      </div>
    )
  }

  const handleCallSidSearch = (e) => {
    e.preventDefault()
    if (callSidSearch.trim()) {
      fetchCallTimeline(callSidSearch.trim())
    }
  }

  // Calculate live call status counts (current status of each unique call)
  const calculateLiveStatusCounts = (events) => {
    const statusCounts = {
      'queued': 0,
      'initiated': 0,
      'ringing': 0,
      'in-progress': 0,
      'completed': 0,
      'busy': 0,
      'no-answer': 0,
      'canceled': 0,
      'failed': 0
    }

    // Group by call_sid and get the latest status for each
    const callsByCallSid = {}
    events.forEach(event => {
      const callSid = event.call_sid
      if (!callsByCallSid[callSid] || new Date(event.timestamp) > new Date(callsByCallSid[callSid].timestamp)) {
        callsByCallSid[callSid] = event
      }
    })

    // Count each status
    Object.values(callsByCallSid).forEach(call => {
      const status = call.call_status
      if (statusCounts[status] !== undefined) {
        statusCounts[status]++
      }
    })

    return statusCounts
  }

  const handleStatusClick = (status) => {
    setSelectedStatusFilter(status)
  }

  // Get unique values for filters
  const uniqueAccountSids = ['all', ...new Set(callEvents.map(e => e.account_sid).filter(Boolean))]
  const uniqueDirections = ['all', ...new Set(callEvents.map(e => e.direction).filter(Boolean))]
  
  // Build event types list from hardcoded categories
  const allEventTypes = [
    'all',
    ...Object.values(eventTypeCategories).flatMap(category => category.types)
  ]
  
  const uniqueSeverities = ['all', ...new Set(errorEvents.map(e => e.severity).filter(Boolean))]
  const uniqueErrorCodes = ['all', ...new Set(errorEvents.map(e => e.error_code).filter(Boolean))]

  // Apply filters to call events (except status filter)
  const baseFilteredCallEvents = callEvents.filter(event => {
    // Only show events with call_sid
    if (!event.call_sid) return false
    
    if (selectedAccountSid !== 'all' && event.account_sid !== selectedAccountSid) return false
    if (appliedCallFilters.direction !== 'all' && event.direction !== appliedCallFilters.direction) return false
    if (appliedCallFilters.eventType !== 'all' && event.event_type !== appliedCallFilters.eventType) return false
    if (appliedCallFilters.callStatus !== 'all' && event.call_status !== appliedCallFilters.callStatus) return false
    if (appliedCallFilters.fromNumber && !event.from_number?.includes(appliedCallFilters.fromNumber)) return false
    if (appliedCallFilters.toNumber && !event.to_number?.includes(appliedCallFilters.toNumber)) return false
    
    if (appliedCallFilters.dateFrom || appliedCallFilters.dateTo) {
      const eventDate = new Date(event.timestamp)
      // Get date string in local timezone (YYYY-MM-DD)
      const year = eventDate.getFullYear()
      const month = String(eventDate.getMonth() + 1).padStart(2, '0')
      const day = String(eventDate.getDate()).padStart(2, '0')
      const eventDateStr = `${year}-${month}-${day}`
      
      if (appliedCallFilters.dateFrom && eventDateStr < appliedCallFilters.dateFrom) {
        return false
      }
      if (appliedCallFilters.dateTo && eventDateStr > appliedCallFilters.dateTo) {
        return false
      }
    }
    
    return true
  })

  // Calculate stats from filtered events (before status filter)
  // Backend already returns deduplicated events (latest per call_sid)
  const liveStatusCounts = calculateLiveStatusCounts(baseFilteredCallEvents)

  // Apply status filter on top of base filters
  const filteredCallEvents = selectedStatusFilter !== 'all'
    ? baseFilteredCallEvents.filter(event => event.call_status === selectedStatusFilter)
    : baseFilteredCallEvents

  // Backend handles deduplication, so filteredCallEvents is already unique per call_sid
  const uniqueFilteredCalls = filteredCallEvents

  // Apply filters to error events
  const filteredErrorEvents = errorEvents.filter(event => {
    if (selectedAccountSid !== 'all' && event.account_sid !== selectedAccountSid) return false
    if (appliedErrorFilters.severity !== 'all' && event.severity !== appliedErrorFilters.severity) return false
    if (appliedErrorFilters.errorCode !== 'all' && event.error_code !== appliedErrorFilters.errorCode) return false
    
    if (appliedErrorFilters.dateFrom || appliedErrorFilters.dateTo) {
      const eventDate = new Date(event.timestamp)
      // Get date string in local timezone (YYYY-MM-DD)
      const year = eventDate.getFullYear()
      const month = String(eventDate.getMonth() + 1).padStart(2, '0')
      const day = String(eventDate.getDate()).padStart(2, '0')
      const eventDateStr = `${year}-${month}-${day}`
      
      if (appliedErrorFilters.dateFrom && eventDateStr < appliedErrorFilters.dateFrom) {
        return false
      }
      if (appliedErrorFilters.dateTo && eventDateStr > appliedErrorFilters.dateTo) {
        return false
      }
    }
    
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900">VoiceOps Dashboard</h1>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Account:</label>
                <select
                  value={selectedAccountSid}
                  onChange={(e) => setSelectedAccountSid(e.target.value)}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {uniqueAccountSids.map(sid => (
                    <option key={sid} value={sid}>
                      {sid === 'all' ? 'All Accounts' : sid}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <span className={`px-3 py-1.5 text-sm font-medium rounded-full ${wsConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {wsConnected ? '● Live' : '● Disconnected'}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-full mx-auto px-6 py-6 h-[calc(100vh-120px)]">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full overflow-hidden">
          {/* Left 75% - Call Events */}
          <div className="lg:col-span-3 h-full flex flex-col overflow-hidden">
            {/* Call Events Table */}
            <div className="bg-white rounded-xl shadow border border-gray-200 h-full flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Phone className="w-5 h-5 text-blue-600" />
                    Call Events ({selectedStatusFilter !== 'all' ? uniqueFilteredCalls.length : filteredCallEvents.length})
                    {selectedStatusFilter !== 'all' && (
                      <span className="text-sm font-normal text-gray-600">- {selectedStatusFilter.replace('-', ' ')}</span>
                    )}
                  </h2>
                  <form onSubmit={handleCallSidSearch} className="flex gap-2">
                    <input
                      type="text"
                      value={callSidSearch}
                      onChange={(e) => setCallSidSearch(e.target.value)}
                      placeholder="Search by Call SID..."
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors"
                    >
                      Search
                    </button>
                  </form>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={applyCallFilters}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors"
                  >
                    <Filter className="w-4 h-4" />
                    Apply Filters
                  </button>
                  <button
                    onClick={clearCallFilters}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Clear Filters
                  </button>
                </div>
              </div>

              {/* Filters Section */}
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Row 1 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Timestamp</label>
                    <select
                      value={callDateRange}
                      onChange={(e) => handleCallDateRangeChange(e.target.value)}
                      className="w-full text-sm px-2 py-1.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="last-1-hour">Last 1 Hour</option>
                      <option value="last-1-week">Last 1 Week</option>
                      <option value="this-month">This Month</option>
                      <option value="last-month">Last Month</option>
                      <option value="custom">Custom Range</option>
                    </select>
                    {callDateRange === 'custom' && (
                      <div className="mt-3 p-4 bg-white border border-blue-200 rounded-xl shadow-sm space-y-3">
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Start Date & Time</label>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Date</label>
                              <input
                                type="date"
                                value={callFilters.dateFrom ? callFilters.dateFrom.split('T')[0] : ''}
                                onChange={(e) => {
                                  const time = callFilters.dateFrom ? callFilters.dateFrom.split('T')[1] : '00:00'
                                  setCallFilters({...callFilters, dateFrom: e.target.value ? `${e.target.value}T${time}` : ''})
                                }}
                                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Time</label>
                              <input
                                type="time"
                                value={callFilters.dateFrom ? callFilters.dateFrom.split('T')[1] || '00:00' : '00:00'}
                                onChange={(e) => {
                                  const date = callFilters.dateFrom ? callFilters.dateFrom.split('T')[0] : new Date().toISOString().split('T')[0]
                                  setCallFilters({...callFilters, dateFrom: `${date}T${e.target.value}`})
                                }}
                                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold text-gray-700 mb-1.5">End Date & Time</label>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Date</label>
                              <input
                                type="date"
                                value={callFilters.dateTo ? callFilters.dateTo.split('T')[0] : ''}
                                onChange={(e) => {
                                  const time = callFilters.dateTo ? callFilters.dateTo.split('T')[1] : '23:59'
                                  setCallFilters({...callFilters, dateTo: e.target.value ? `${e.target.value}T${time}` : ''})
                                }}
                                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Time</label>
                              <input
                                type="time"
                                value={callFilters.dateTo ? callFilters.dateTo.split('T')[1] || '23:59' : '23:59'}
                                onChange={(e) => {
                                  const date = callFilters.dateTo ? callFilters.dateTo.split('T')[0] : new Date().toISOString().split('T')[0]
                                  setCallFilters({...callFilters, dateTo: `${date}T${e.target.value}`})
                                }}
                                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Call Status</label>
                    <select
                      value={callFilters.callStatus}
                      onChange={(e) => setCallFilters({...callFilters, callStatus: e.target.value})}
                      className="w-full text-sm px-2 py-1.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Status</option>
                      <option value="queued">Queued</option>
                      <option value="initiated">Initiated</option>
                      <option value="ringing">Ringing</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="busy">Busy</option>
                      <option value="no-answer">No Answer</option>
                      <option value="canceled">Canceled</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Direction</label>
                    <select
                      value={callFilters.direction}
                      onChange={(e) => setCallFilters({...callFilters, direction: e.target.value})}
                      className="w-full text-sm px-2 py-1.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Directions</option>
                      <option value="inbound">Inbound</option>
                      <option value="outbound-api">Outbound API</option>
                    </select>
                  </div>
                  {/* Row 2 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">From Number</label>
                    <input
                      type="text"
                      value={callFilters.fromNumber}
                      onChange={(e) => setCallFilters({...callFilters, fromNumber: e.target.value})}
                      placeholder="Enter from number..."
                      className="w-full text-sm px-2 py-1.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">To Number</label>
                    <input
                      type="text"
                      value={callFilters.toNumber}
                      onChange={(e) => setCallFilters({...callFilters, toNumber: e.target.value})}
                      placeholder="Enter to number..."
                      className="w-full text-sm px-2 py-1.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Event Type</label>
                    <select
                      value={callFilters.eventType}
                      onChange={(e) => setCallFilters({...callFilters, eventType: e.target.value})}
                      className="w-full text-sm px-2 py-1.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Event Types</option>
                      {Object.entries(eventTypeCategories).map(([key, category]) => (
                        <optgroup key={key} label={category.label}>
                          {category.types.map(type => (
                            <option key={type} value={type}>
                              {formatEventType(type)}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Call SID / Timestamp
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Direction
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          From / To
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Event Type
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(selectedStatusFilter !== 'all' ? uniqueFilteredCalls : filteredCallEvents).length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                            No call events found
                          </td>
                        </tr>
                      ) : (
                        (selectedStatusFilter !== 'all' ? uniqueFilteredCalls : filteredCallEvents).map((event) => (
                          <tr 
                            key={event.event_id} 
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-4 py-4 text-center">
                              {getCallStatusIcon(event)}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span 
                                  className="text-sm font-mono text-blue-600 cursor-pointer hover:underline"
                                  onClick={() => fetchCallTimeline(event.call_sid)}
                                >
                                  {event.call_sid}
                                </span>
                                <span className="text-xs text-gray-500 mt-1">{formatTimestamp(event.timestamp)}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-block w-20 text-center px-2 py-1 text-xs font-medium rounded-full border ${getCallStatusColor(event.call_status)}`}>
                                {event.call_status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {event.direction || '-'}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col text-sm">
                                <span className="text-gray-900">{event.from_number || '-'}</span>
                                <span className="text-gray-600 mt-1">{event.to_number || '-'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 text-xs font-medium rounded-full border bg-gray-50 text-gray-700 border-gray-300">
                                {formatEventType(event.event_type)}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Right 25% - Error Events (Full Height) */}
          <div className="lg:col-span-1 h-full overflow-hidden">
            <div className="bg-white rounded-xl shadow border border-gray-200 h-full flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    Error Events ({filteredErrorEvents.length})
                  </h2>
                </div>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <select
                      value={errorFilters.severity}
                      onChange={(e) => setErrorFilters({...errorFilters, severity: e.target.value})}
                      className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded-full"
                    >
                      <option value="all">All Severities</option>
                      {uniqueSeverities.filter(s => s !== 'all').map(severity => (
                        <option key={severity} value={severity}>{severity}</option>
                      ))}
                    </select>
                    <select
                      value={errorFilters.errorCode}
                      onChange={(e) => setErrorFilters({...errorFilters, errorCode: e.target.value})}
                      className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded-full"
                    >
                      <option value="all">All Codes</option>
                      {uniqueErrorCodes.filter(c => c !== 'all').map(code => (
                        <option key={code} value={code}>{code}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <select
                      value={errorDateRange}
                      onChange={(e) => handleErrorDateRangeChange(e.target.value)}
                      className="w-full text-xs px-2 py-1 border border-gray-300 rounded-full"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="last-1-hour">Last 1 Hour</option>
                      <option value="last-1-week">Last 1 Week</option>
                      <option value="this-month">This Month</option>
                      <option value="last-month">Last Month</option>
                      <option value="custom">Custom Range</option>
                    </select>
                    {errorDateRange === 'custom' && (
                      <div className="p-3 bg-white border border-blue-200 rounded-xl shadow-sm space-y-3">
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date & Time</label>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Date</label>
                              <input
                                type="date"
                                value={errorFilters.dateFrom ? errorFilters.dateFrom.split('T')[0] : ''}
                                onChange={(e) => {
                                  const time = errorFilters.dateFrom ? errorFilters.dateFrom.split('T')[1] : '00:00'
                                  setErrorFilters({...errorFilters, dateFrom: e.target.value ? `${e.target.value}T${time}` : ''})
                                }}
                                className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Time</label>
                              <input
                                type="time"
                                value={errorFilters.dateFrom ? errorFilters.dateFrom.split('T')[1] || '00:00' : '00:00'}
                                onChange={(e) => {
                                  const date = errorFilters.dateFrom ? errorFilters.dateFrom.split('T')[0] : new Date().toISOString().split('T')[0]
                                  setErrorFilters({...errorFilters, dateFrom: `${date}T${e.target.value}`})
                                }}
                                className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold text-gray-700 mb-1">End Date & Time</label>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Date</label>
                              <input
                                type="date"
                                value={errorFilters.dateTo ? errorFilters.dateTo.split('T')[0] : ''}
                                onChange={(e) => {
                                  const time = errorFilters.dateTo ? errorFilters.dateTo.split('T')[1] : '23:59'
                                  setErrorFilters({...errorFilters, dateTo: e.target.value ? `${e.target.value}T${time}` : ''})
                                }}
                                className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Time</label>
                              <input
                                type="time"
                                value={errorFilters.dateTo ? errorFilters.dateTo.split('T')[1] || '23:59' : '23:59'}
                                onChange={(e) => {
                                  const date = errorFilters.dateTo ? errorFilters.dateTo.split('T')[0] : new Date().toISOString().split('T')[0]
                                  setErrorFilters({...errorFilters, dateTo: `${date}T${e.target.value}`})
                                }}
                                className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={applyErrorFilters}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors"
                    >
                      <Filter className="w-3 h-3" />
                      Apply Filters
                    </button>
                    <button
                      onClick={clearErrorFilters}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
                    >
                      <X className="w-3 h-3" />
                      Clear Filters
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <div className="divide-y divide-gray-200">
                  {filteredErrorEvents.length === 0 ? (
                    <div className="px-6 py-8 text-center text-gray-500">
                      No error events found
                    </div>
                  ) : (
                    filteredErrorEvents.map((event) => (
                      <div key={event.event_id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getSeverityColor(event.severity)}`}>
                              {event.severity}
                            </span>
                            <span className="px-2 py-1 text-xs font-medium rounded-full border border-gray-300 bg-gray-50 text-gray-700">
                              {event.error_code}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatTimestamp(event.timestamp)}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {event.error_message && (
                            <p className="text-sm text-gray-900">
                              {event.error_message}
                            </p>
                          )}
                          {event.product && (
                            <p className="text-xs text-gray-600">
                              Product: {event.product}
                            </p>
                          )}
                          {event.correlation_sid && (
                            <div className="flex items-center gap-1">
                              <p className="text-xs text-gray-500 font-mono truncate flex-1">
                                {event.correlation_sid}
                              </p>
                              <button
                                onClick={() => copyToClipboard(event.correlation_sid)}
                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                                title="Copy correlation SID"
                              >
                                {copiedId === event.correlation_sid ? (
                                  <Check className="w-3 h-3 text-green-600" />
                                ) : (
                                  <Copy className="w-3 h-3 text-gray-600" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Call Timeline Modal */}
      {selectedCallSid && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={closeTimeline}>
          <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex" onClick={(e) => e.stopPropagation()}>
            {/* Main Content */}
            <div className={`flex-1 flex flex-col ${selectedPayload ? 'max-w-[60%]' : 'w-full'}`}>
              <div className="px-6 py-1 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Call Trace</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={saveTimelineAsImage}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors"
                    title="Save timeline as image"
                  >
                    <Download className="w-4 h-4" />
                    Save Timeline
                  </button>
                  <button
                    onClick={closeTimeline}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {loadingTimeline ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : callTimeline ? (
                <div ref={timelineRef} className="space-y-4">
                  {/* Header Section */}
                  <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-6 border border-gray-200 shadow-sm">
                    <div className="space-y-4">
                      <span className="text-xs font-semibold text-gray-800">Account: {callTimeline.header.account_sid} </span>
                      {/* Call SID and Final Status in one row */}
                      <div className="flex items-center gap-3">
                        {/* Call SID */}
                        <span className="text-lg font-semibold text-gray-800">Call SID: </span>
                        <code className="text-md bg-white px-4 py-2 rounded-full border border-gray-300 font-mono">
                          {callTimeline.header.call_sid}
                        </code>
                        <button
                          onClick={() => copyToClipboard(callTimeline.header.call_sid)}
                          className="p-1 hover:bg-white rounded transition-colors"
                        >
                          {copiedId === callTimeline.header.call_sid ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-600" />
                          )}
                        </button>
                      </div>
                        
                      {/* Direction, From → To - Pills in one line */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {callTimeline.header.participant_label && (
                          <span className="px-2.5 py-1 text-xs font-medium rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700">
                            {callTimeline.header.participant_label}
                          </span>
                        )}
                        <span className="px-2.5 py-1 text-xs font-medium rounded-full border border-gray-300 bg-gray-100 text-gray-700">
                          {callTimeline.header.direction}
                        </span>
                        <span className="px-2.5 py-1 text-xs font-medium rounded-full border border-gray-300 bg-gray-100 text-gray-700">
                          {callTimeline.header.from_number} → {callTimeline.header.to_number}
                        </span>
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getCallStatusColor(callTimeline.header.final_status)}`}>
                          {callTimeline.header.final_status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Events Timeline */}
                  <div className="relative">
                    {/* Timeline vertical line */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300"></div>
                    
                    {callTimeline.events.map((event, index) => (
                      <div key={`${event.category}-${index}`} className="relative pl-12 pb-4">
                        {/* Timeline dot - centered vertically */}
                        <div className={`absolute left-2.5 top-6 w-3 h-3 rounded-full border-2 border-white ${
                          event.category === 'error' ? 'bg-red-400' : 'bg-slate-400'
                        }`}></div>
                        
                        <div className={`p-4 rounded-xl border shadow-sm ${
                          event.category === 'error' 
                            ? 'bg-white border-red-200' 
                            : 'bg-white border-gray-200'
                        }`}>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {event.category === 'error' ? (
                                <AlertCircle className="w-5 h-5 text-red-500" />
                              ) : (
                                <Phone className="w-5 h-5 text-slate-500" />
                              )}
                              <span className="font-semibold text-gray-900">
                                {formatEventType(event.event_type)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">
                                {formatTimestamp(event.timestamp)}
                              </span>
                              <button
                                onClick={() => setSelectedPayload(event.payload)}
                                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors border border-gray-300"
                              >
                                Payload
                              </button>
                            </div>
                          </div>
                          
                          {/* Event Details */}
                          {renderEventDetails(event)}
                        </div>
                      </div>
                    ))}
                    
                    {callTimeline.events.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No events found for this call
                      </div>
                    )}
                  </div>

                  {/* Conference Trace Section */}
                  {conferenceTimeline && (
                    <div className="space-y-4 mt-8">
                      {/* Conference Header */}
                      <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-6 border border-indigo-200 shadow-sm">
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <span className="text-base font-semibold text-gray-800">Conference SID: </span>
                            <code className="text-md bg-white px-4 py-2 rounded-full border border-gray-300 font-mono">
                              {conferenceTimeline.header.conference_sid}
                            </code>
                            <button
                              onClick={() => copyToClipboard(conferenceTimeline.header.conference_sid)}
                              className="p-1 hover:bg-white rounded transition-colors"
                            >
                              {copiedId === conferenceTimeline.header.conference_sid ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <Copy className="w-4 h-4 text-gray-600" />
                              )}
                            </button>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            {conferenceTimeline.header.friendly_name && (
                              <span className="px-2.5 py-1 text-xs font-medium rounded-full border border-gray-300 bg-gray-100 text-gray-700">
                                {conferenceTimeline.header.friendly_name}
                              </span>
                            )}
                            {conferenceTimeline.header.reason_ended && (
                              <span className="px-2.5 py-1 text-xs font-medium rounded-full border border-orange-200 bg-orange-50 text-orange-700">
                                {conferenceTimeline.header.reason_ended}
                              </span>
                            )}
                            {conferenceTimeline.header.ended_by && (
                              <span className="px-2.5 py-1 text-xs font-medium rounded-full border border-purple-200 bg-purple-50 text-purple-700">
                                Ended by: {conferenceTimeline.header.ended_by}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Conference Events Timeline */}
                      <div className="relative">
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-indigo-300"></div>
                        
                        {conferenceTimeline.events.map((event, index) => (
                          <div key={`conference-${event.category}-${index}`} className="relative pl-12 pb-4">
                            <div className={`absolute left-2.5 top-6 w-3 h-3 rounded-full border-2 border-white ${
                              event.category === 'error' ? 'bg-red-400' : 'bg-indigo-400'
                            }`}></div>
                            
                            <div className={`p-4 rounded-xl border shadow-sm ${
                              event.category === 'error' 
                                ? 'bg-white border-red-200' 
                                : 'bg-white border-indigo-200'
                            }`}>
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  {event.category === 'error' ? (
                                    <AlertCircle className="w-5 h-5 text-red-500" />
                                  ) : (
                                    <Phone className="w-5 h-5 text-indigo-500" />
                                  )}
                                  <span className="font-semibold text-gray-900">
                                    {formatEventType(event.event_type)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-600">
                                    {formatTimestamp(event.timestamp)}
                                  </span>
                                  <button
                                    onClick={() => setSelectedPayload(event.payload)}
                                    className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors border border-gray-300"
                                  >
                                    Payload
                                  </button>
                                </div>
                              </div>
                              
                              {renderEventDetails(event)}
                            </div>
                          </div>
                        ))}
                        
                        {conferenceTimeline.events.length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            No conference events found
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No call trace found
                </div>
              )}
              </div>
            </div>

            {/* Payload Side Panel */}
            {selectedPayload && (
              <div className="w-[40%] border-l border-gray-300 flex flex-col bg-gray-50">
                <div className="px-4 py-2 border-b border-gray-300 flex items-center justify-between bg-white">
                  <h3 className="text-lg font-semibold text-gray-900">Event Payload</h3>
                  <button
                    onClick={() => setSelectedPayload(null)}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <pre className="bg-gray-900 text-green-400 p-4 rounded-xl text-xs font-mono overflow-x-auto">
                    {JSON.stringify(selectedPayload, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
