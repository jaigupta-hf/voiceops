import { AlertCircle, RefreshCw, CheckCircle, Clock } from 'lucide-react'
import '../App.css'
import { getCallStatusColor, getSeverityColor } from '../utils/theme'
import { useDashboardData } from '../hooks/useDashboardData'
import { useDashboardFilters } from '../hooks/useDashboardFilters'
import { useDashboardTimeline } from '../hooks/useDashboardTimeline'
import DashboardHeader from '../components/layout/DashboardHeader'
import CallEventsPanel from '../components/calls/CallEventsPanel'
import ErrorEventsPanel from '../components/errors/ErrorEventsPanel'
import CallTimelineModal from '../components/calls/CallTimelineModal'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000'

function Dashboard({ user, logout }) {
  const {
    callEvents,
    errorEvents,
    loading,
    wsConnected,
    errorEventsNextPage,
    loadingMoreCalls,
    loadingMoreErrors,
    showLoadMoreCalls,
    callEventsScrollRef,
    fetchData,
    loadMoreCallEvents,
    handleCallEventsScroll,
    loadMoreErrorEvents,
  } = useDashboardData({ apiBaseUrl: API_BASE_URL, wsBaseUrl: WS_BASE_URL })

  const {
    selectedAccountSid,
    setSelectedAccountSid,
    selectedTimezone,
    setSelectedTimezone,
    callDateRange,
    errorDateRange,
    callFilters,
    setCallFilters,
    errorFilters,
    setErrorFilters,
    selectedStatusFilter,
    callSidSearch,
    setCallSidSearch,
    handleCallDateRangeChange,
    handleErrorDateRangeChange,
    clearCallFilters,
    applyCallFilters,
    clearErrorFilters,
    applyErrorFilters,
    uniqueAccountSids,
    uniqueSeverities,
    uniqueErrorCodes,
    filteredCallEvents,
    uniqueFilteredCalls,
    filteredErrorEvents,
  } = useDashboardFilters({
    callEvents,
    errorEvents,
    refreshCallData: fetchData,
  })

  const {
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
  } = useDashboardTimeline({ apiBaseUrl: API_BASE_URL })

  const getCallStatusIcon = (event) => {
    const hasError = errorEvents.some(error => error.correlation_sid === event.call_sid)

    if (hasError) {
      return <AlertCircle className="w-5 h-5 text-red-500" />
    }

    const isCompleted = (event.event_type && event.event_type.includes('status-callback.call.completed')) ||
      callEvents.some(e => e.call_sid === event.call_sid && e.event_type && e.event_type.includes('status-callback.call.completed'))

    if (isCompleted) {
      return <CheckCircle className="w-5 h-5 text-green-500" />
    }

    return <Clock className="w-5 h-5 text-blue-500" />
  }

  const renderEventDetails = (event) => {
    const details = event.details || {}

    if (event.category === 'error') {
      return (
        <div className="space-y-2">
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
          {details.error_message && (
            <p className="text-sm text-gray-900">{details.error_message}</p>
          )}
        </div>
      )
    }

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

    if (event.event_type && event.event_type.includes('status-callback.conference.participant')) {
      const booleanFields = ['hold', 'muted', 'coaching']
      const excludedFields = ['conference_sid', 'friendly_name', 'status', 'call_sid', 'participant_label']
      const otherFields = Object.entries(details).filter(([key]) => !booleanFields.includes(key) && !excludedFields.includes(key))

      return (
        <div className="space-y-2 text-sm">
          <div className="flex gap-2 flex-wrap">
            {details.status && (
              <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getCallStatusColor(details.status)}`}>
                {details.status}
              </span>
            )}
            {details.participant_label ? (
              <span className="px-2.5 py-1 text-xs font-medium rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700">
                {details.participant_label}
              </span>
            ) : details.call_sid && details.call_sid !== 'N/A' && (
              <span className="px-2.5 py-1 text-xs font-medium rounded-full border border-purple-200 bg-purple-50 text-purple-700">
                {details.call_sid}
              </span>
            )}
            {(details.hold === 'true' || details.hold === true) && (
              <span className="px-2.5 py-1 text-xs font-medium rounded-full border border-orange-200 bg-orange-50 text-orange-700">
                Hold
              </span>
            )}
            {(details.muted === 'true' || details.muted === true) && (
              <span className="px-2.5 py-1 text-xs font-medium rounded-full border border-orange-200 bg-orange-50 text-orange-700">
                Muted
              </span>
            )}
            {(details.coaching === 'true' || details.coaching === true) && (
              <span className="px-2.5 py-1 text-xs font-medium rounded-full border border-orange-200 bg-orange-50 text-orange-700">
                Coaching
              </span>
            )}
          </div>

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
        </div>
      )
    }

    if (event.event_type && event.event_type.includes('status-callback.conference') && !event.event_type.includes('participant')) {
      const excludedFields = ['conference_sid', 'friendly_name', 'status']
      const filteredFields = Object.entries(details).filter(([key]) => !excludedFields.includes(key))

      return (
        <div className="space-y-2 text-sm">
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

    if (event.event_type && event.event_type.includes('api-request.conference-participant')) {
      const booleanFields = ['hold', 'muted', 'coaching']
      const excludedFields = ['status', 'call_sid', 'participant_label']
      const otherFields = Object.entries(details).filter(([key]) => !booleanFields.includes(key) && !excludedFields.includes(key))

      return (
        <div className="space-y-2 text-sm">
          <div className="flex gap-2 flex-wrap">
            {details.status && (
              <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getCallStatusColor(details.status)}`}>
                {details.status}
              </span>
            )}
            {details.participant_label && (
              <span className="px-2.5 py-1 text-xs font-medium rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700">
                {details.participant_label}
              </span>
            )}
            {details.call_sid && details.call_sid !== 'N/A' && (
              <span className="px-2.5 py-1 text-xs font-medium rounded-full border border-purple-200 bg-purple-50 text-purple-700">
                {details.call_sid}
              </span>
            )}
            {(details.hold === 'true' || details.hold === true) && (
              <span className="px-2.5 py-1 text-xs font-medium rounded-full border border-orange-200 bg-orange-50 text-orange-700">
                Hold
              </span>
            )}
            {(details.muted === 'true' || details.muted === true) && (
              <span className="px-2.5 py-1 text-xs font-medium rounded-full border border-orange-200 bg-orange-50 text-orange-700">
                Muted
              </span>
            )}
            {(details.coaching === 'true' || details.coaching === true) && (
              <span className="px-2.5 py-1 text-xs font-medium rounded-full border border-orange-200 bg-orange-50 text-orange-700">
                Coaching
              </span>
            )}
          </div>

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
        </div>
      )
    }

    return (
      <div className="space-y-2 text-sm">
        {Object.entries(details).map(([key, value]) => {
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

  const handleCallSidSearch = (e) => {
    e.preventDefault()
    if (callSidSearch.trim()) {
      fetchCallTimeline(callSidSearch.trim())
    }
  }

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
      <DashboardHeader
        selectedAccountSid={selectedAccountSid}
        setSelectedAccountSid={setSelectedAccountSid}
        uniqueAccountSids={uniqueAccountSids}
        selectedTimezone={selectedTimezone}
        setSelectedTimezone={setSelectedTimezone}
        user={user}
        logout={logout}
        wsConnected={wsConnected}
      />

      <div className="max-w-full mx-auto px-6 py-6 h-[calc(103vh-120px)]">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full overflow-hidden">
          <div className="lg:col-span-3 h-full flex flex-col overflow-hidden">
            <CallEventsPanel
              callSidSearch={callSidSearch}
              setCallSidSearch={setCallSidSearch}
              handleCallSidSearch={handleCallSidSearch}
              applyCallFilters={applyCallFilters}
              clearCallFilters={clearCallFilters}
              callDateRange={callDateRange}
              handleCallDateRangeChange={handleCallDateRangeChange}
              callFilters={callFilters}
              setCallFilters={setCallFilters}
              selectedStatusFilter={selectedStatusFilter}
              uniqueFilteredCalls={uniqueFilteredCalls}
              filteredCallEvents={filteredCallEvents}
              callEventsScrollRef={callEventsScrollRef}
              handleCallEventsScroll={handleCallEventsScroll}
              getCallStatusIcon={getCallStatusIcon}
              fetchCallTimeline={fetchCallTimeline}
              selectedTimezone={selectedTimezone}
              showLoadMoreCalls={showLoadMoreCalls}
              loadMoreCallEvents={loadMoreCallEvents}
              loadingMoreCalls={loadingMoreCalls}
              getCallStatusColor={getCallStatusColor}
            />
          </div>

          <div className="lg:col-span-1 h-full overflow-hidden">
            <ErrorEventsPanel
              errorFilters={errorFilters}
              setErrorFilters={setErrorFilters}
              uniqueSeverities={uniqueSeverities}
              uniqueErrorCodes={uniqueErrorCodes}
              errorDateRange={errorDateRange}
              handleErrorDateRangeChange={handleErrorDateRangeChange}
              applyErrorFilters={applyErrorFilters}
              clearErrorFilters={clearErrorFilters}
              filteredErrorEvents={filteredErrorEvents}
              getSeverityColor={getSeverityColor}
              selectedTimezone={selectedTimezone}
              fetchCallTimeline={fetchCallTimeline}
              copyToClipboard={copyToClipboard}
              copiedId={copiedId}
              errorEventsNextPage={errorEventsNextPage}
              loadMoreErrorEvents={loadMoreErrorEvents}
              loadingMoreErrors={loadingMoreErrors}
            />
          </div>
        </div>
      </div>

      <CallTimelineModal
        selectedCallSid={selectedCallSid}
        closeTimeline={closeTimeline}
        selectedPayload={selectedPayload}
        setSelectedPayload={setSelectedPayload}
        saveTimelineAsImage={saveTimelineAsImage}
        loadingTimeline={loadingTimeline}
        callTimeline={callTimeline}
        conferenceTimeline={conferenceTimeline}
        copyToClipboard={copyToClipboard}
        copiedId={copiedId}
        getCallStatusColor={getCallStatusColor}
        renderEventDetails={renderEventDetails}
        selectedTimezone={selectedTimezone}
        copyPayloadToClipboard={copyPayloadToClipboard}
        downloadPayload={downloadPayload}
        timelineRef={timelineRef}
      />
    </div>
  )
}

export default Dashboard
