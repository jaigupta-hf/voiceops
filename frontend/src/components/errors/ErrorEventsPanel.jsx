import { AlertCircle, Filter, X, Check, Copy, RefreshCw } from 'lucide-react'
import { formatTimestamp } from '../../utils/formatters'

function ErrorEventsPanel({
  errorFilters,
  setErrorFilters,
  uniqueSeverities,
  uniqueErrorCodes,
  errorDateRange,
  handleErrorDateRangeChange,
  applyErrorFilters,
  clearErrorFilters,
  filteredErrorEvents,
  getSeverityColor,
  selectedTimezone,
  fetchCallTimeline,
  copyToClipboard,
  copiedId,
  errorEventsNextPage,
  loadMoreErrorEvents,
  loadingMoreErrors,
}) {
  return (
    <div className="bg-white rounded-xl shadow border border-gray-200 h-full flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            Error Events
          </h2>
        </div>
        <div className="space-y-2">
          <div className="flex gap-2">
            <select
              value={errorFilters.severity}
              onChange={(e) => setErrorFilters({ ...errorFilters, severity: e.target.value })}
              className={`flex-1 text-xs px-2 py-1 border rounded-full ${
                errorFilters.severity !== 'all'
                  ? 'bg-blue-100 border-blue-400 font-semibold text-blue-900'
                  : 'border-gray-300 bg-white'
              }`}
            >
              <option value="all">All Severities</option>
              {uniqueSeverities.filter(s => s !== 'all').map(severity => (
                <option key={severity} value={severity}>{severity}</option>
              ))}
            </select>
            <select
              value={errorFilters.errorCode}
              onChange={(e) => setErrorFilters({ ...errorFilters, errorCode: e.target.value })}
              className={`flex-1 text-xs px-2 py-1 border rounded-full ${
                errorFilters.errorCode !== 'all'
                  ? 'bg-blue-100 border-blue-400 font-semibold text-blue-900'
                  : 'border-gray-300 bg-white'
              }`}
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
              className={`w-full text-xs px-2 py-1 border rounded-full ${
                errorDateRange !== 'all'
                  ? 'bg-blue-100 border-blue-400 font-semibold text-blue-900'
                  : 'border-gray-300 bg-white'
              }`}
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
                          setErrorFilters({ ...errorFilters, dateFrom: e.target.value ? `${e.target.value}T${time}` : '' })
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
                          setErrorFilters({ ...errorFilters, dateFrom: `${date}T${e.target.value}` })
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
                          setErrorFilters({ ...errorFilters, dateTo: e.target.value ? `${e.target.value}T${time}` : '' })
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
                          setErrorFilters({ ...errorFilters, dateTo: `${date}T${e.target.value}` })
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
            <div className="px-6 py-8 text-center text-gray-500">No error events found</div>
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
                    {formatTimestamp(event.timestamp, selectedTimezone)}
                  </span>
                </div>
                <div className="space-y-1">
                  {event.error_message && (
                    <p className="text-sm text-gray-900">{event.error_message}</p>
                  )}
                  {event.product && (
                    <p className="text-xs text-gray-600">Product: {event.product}</p>
                  )}
                  {event.correlation_sid && (
                    <div className="flex items-center gap-1">
                      <p
                        className="text-xs text-blue-600 font-mono truncate flex-1 cursor-pointer hover:underline"
                        onClick={() => fetchCallTimeline(event.correlation_sid)}
                        title="View call trace"
                      >
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

        {errorEventsNextPage && (
          <div className="px-6 py-2 border-t border-gray-200 flex justify-center">
            <button
              onClick={loadMoreErrorEvents}
              disabled={loadingMoreErrors}
              className="px-4 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-full transition-colors flex items-center gap-2"
            >
              {loadingMoreErrors ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load More...'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ErrorEventsPanel
