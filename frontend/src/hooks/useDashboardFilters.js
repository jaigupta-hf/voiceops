import { useMemo, useState } from 'react'
import { getDateRangeForQuickFilter } from '../utils/formatters'

const defaultCallFilters = {
  dateFrom: '',
  dateTo: '',
  direction: 'all',
  eventType: 'all',
  callStatus: 'all',
  fromNumber: '',
  toNumber: '',
}

const defaultErrorFilters = {
  severity: 'all',
  errorCode: 'all',
  dateFrom: '',
  dateTo: '',
}

export function useDashboardFilters({ callEvents, errorEvents, refreshCallData }) {
  const [selectedAccountSid, setSelectedAccountSid] = useState('all')
  const [selectedTimezone, setSelectedTimezone] = useState('IST')
  const [callDateRange, setCallDateRange] = useState('all')
  const [errorDateRange, setErrorDateRange] = useState('all')
  const [callFilters, setCallFilters] = useState(defaultCallFilters)
  const [appliedCallFilters, setAppliedCallFilters] = useState(defaultCallFilters)
  const [errorFilters, setErrorFilters] = useState(defaultErrorFilters)
  const [appliedErrorFilters, setAppliedErrorFilters] = useState(defaultErrorFilters)
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all')
  const [callSidSearch, setCallSidSearch] = useState('')

  const handleCallDateRangeChange = (range) => {
    setCallDateRange(range)
    if (range !== 'custom') {
      const { dateFrom, dateTo } = getDateRangeForQuickFilter(range)
      setCallFilters({ ...callFilters, dateFrom, dateTo })
    }
  }

  const handleErrorDateRangeChange = (range) => {
    setErrorDateRange(range)
    if (range !== 'custom') {
      const { dateFrom, dateTo } = getDateRangeForQuickFilter(range)
      setErrorFilters({ ...errorFilters, dateFrom, dateTo })
    }
  }

  const clearCallFilters = () => {
    setCallDateRange('all')
    setCallFilters(defaultCallFilters)
    setAppliedCallFilters(defaultCallFilters)
    refreshCallData?.(true)
  }

  const applyCallFilters = () => {
    setAppliedCallFilters(callFilters)
    refreshCallData?.(true)
  }

  const clearErrorFilters = () => {
    setErrorDateRange('all')
    setErrorFilters(defaultErrorFilters)
    setAppliedErrorFilters(defaultErrorFilters)
  }

  const applyErrorFilters = () => {
    setAppliedErrorFilters(errorFilters)
  }

  const uniqueAccountSids = useMemo(
    () => ['all', ...new Set(callEvents.map(e => e.account_sid).filter(Boolean))],
    [callEvents],
  )

  const uniqueSeverities = useMemo(
    () => ['all', ...new Set(errorEvents.map(e => e.severity).filter(Boolean))],
    [errorEvents],
  )

  const uniqueErrorCodes = useMemo(
    () => ['all', ...new Set(errorEvents.map(e => e.error_code).filter(Boolean))],
    [errorEvents],
  )

  const baseFilteredCallEvents = useMemo(
    () => callEvents.filter(event => {
      if (!event.call_sid) return false
      if (selectedAccountSid !== 'all' && event.account_sid !== selectedAccountSid) return false
      if (appliedCallFilters.direction !== 'all' && event.direction !== appliedCallFilters.direction) return false
      if (appliedCallFilters.eventType !== 'all' && event.event_type !== appliedCallFilters.eventType) return false
      if (appliedCallFilters.callStatus !== 'all' && event.call_status !== appliedCallFilters.callStatus) return false
      if (appliedCallFilters.fromNumber && !event.from_number?.includes(appliedCallFilters.fromNumber)) return false
      if (appliedCallFilters.toNumber && !event.to_number?.includes(appliedCallFilters.toNumber)) return false

      if (appliedCallFilters.dateFrom || appliedCallFilters.dateTo) {
        const eventDate = new Date(event.timestamp)
        const year = eventDate.getFullYear()
        const month = String(eventDate.getMonth() + 1).padStart(2, '0')
        const day = String(eventDate.getDate()).padStart(2, '0')
        const eventDateStr = `${year}-${month}-${day}`

        if (appliedCallFilters.dateFrom && eventDateStr < appliedCallFilters.dateFrom) return false
        if (appliedCallFilters.dateTo && eventDateStr > appliedCallFilters.dateTo) return false
      }

      return true
    }),
    [callEvents, selectedAccountSid, appliedCallFilters],
  )

  const filteredCallEvents = useMemo(
    () => (selectedStatusFilter !== 'all'
      ? baseFilteredCallEvents.filter(event => event.call_status === selectedStatusFilter)
      : baseFilteredCallEvents),
    [baseFilteredCallEvents, selectedStatusFilter],
  )

  const uniqueFilteredCalls = filteredCallEvents

  const filteredErrorEvents = useMemo(
    () => errorEvents.filter(event => {
      if (selectedAccountSid !== 'all' && event.account_sid !== selectedAccountSid) return false
      if (appliedErrorFilters.severity !== 'all' && event.severity !== appliedErrorFilters.severity) return false
      if (appliedErrorFilters.errorCode !== 'all' && event.error_code !== appliedErrorFilters.errorCode) return false

      if (appliedErrorFilters.dateFrom || appliedErrorFilters.dateTo) {
        const eventDate = new Date(event.timestamp)
        const year = eventDate.getFullYear()
        const month = String(eventDate.getMonth() + 1).padStart(2, '0')
        const day = String(eventDate.getDate()).padStart(2, '0')
        const eventDateStr = `${year}-${month}-${day}`

        if (appliedErrorFilters.dateFrom && eventDateStr < appliedErrorFilters.dateFrom) return false
        if (appliedErrorFilters.dateTo && eventDateStr > appliedErrorFilters.dateTo) return false
      }

      return true
    }),
    [errorEvents, selectedAccountSid, appliedErrorFilters],
  )

  return {
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
    setSelectedStatusFilter,
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
  }
}
