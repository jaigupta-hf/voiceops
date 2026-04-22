import { Phone, RefreshCw, Filter, X } from 'lucide-react'
import { formatTimestamp } from '../../utils/formatters'

function CallEventsPanel({
  callSidSearch,
  setCallSidSearch,
  handleCallSidSearch,
  applyCallFilters,
  clearCallFilters,
  callDateRange,
  handleCallDateRangeChange,
  callFilters,
  setCallFilters,
  selectedStatusFilter,
  uniqueFilteredCalls,
  filteredCallEvents,
  callEventsScrollRef,
  handleCallEventsScroll,
  getCallStatusIcon,
  fetchCallTimeline,
  selectedTimezone,
  showLoadMoreCalls,
  loadMoreCallEvents,
  loadingMoreCalls,
  getCallStatusColor,
}) {
  const displayedCallEvents = selectedStatusFilter !== 'all' ? uniqueFilteredCalls : filteredCallEvents

  return (
    <div className="bg-white rounded-xl shadow border border-gray-200 h-full flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Phone className="w-5 h-5 text-blue-600" />
            Call Events
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

      <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Timestamp</label>
            <select
              value={callDateRange}
              onChange={(e) => handleCallDateRangeChange(e.target.value)}
              className={`w-full text-sm px-2 py-1.5 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                callDateRange !== 'all'
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
                          setCallFilters({ ...callFilters, dateFrom: e.target.value ? `${e.target.value}T${time}` : '' })
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
                          setCallFilters({ ...callFilters, dateFrom: `${date}T${e.target.value}` })
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
                          setCallFilters({ ...callFilters, dateTo: e.target.value ? `${e.target.value}T${time}` : '' })
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
                          setCallFilters({ ...callFilters, dateTo: `${date}T${e.target.value}` })
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
              onChange={(e) => setCallFilters({ ...callFilters, callStatus: e.target.value })}
              className={`w-full text-sm px-2 py-1.5 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                callFilters.callStatus !== 'all'
                  ? 'bg-blue-100 border-blue-400 font-semibold text-blue-900'
                  : 'border-gray-300 bg-white'
              }`}
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
              onChange={(e) => setCallFilters({ ...callFilters, direction: e.target.value })}
              className={`w-full text-sm px-2 py-1.5 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                callFilters.direction !== 'all'
                  ? 'bg-blue-100 border-blue-400 font-semibold text-blue-900'
                  : 'border-gray-300 bg-white'
              }`}
            >
              <option value="all">All Directions</option>
              <option value="inbound">Inbound</option>
              <option value="outbound-api">Outbound</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">From Number</label>
            <input
              type="text"
              value={callFilters.fromNumber}
              onChange={(e) => setCallFilters({ ...callFilters, fromNumber: e.target.value })}
              placeholder="Enter from number..."
              className={`w-full text-sm px-2 py-1.5 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                callFilters.fromNumber
                  ? 'bg-blue-100 border-blue-400 font-semibold text-blue-900'
                  : 'border-gray-300 bg-white'
              }`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">To Number</label>
            <input
              type="text"
              value={callFilters.toNumber}
              onChange={(e) => setCallFilters({ ...callFilters, toNumber: e.target.value })}
              placeholder="Enter to number..."
              className={`w-full text-sm px-2 py-1.5 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                callFilters.toNumber
                  ? 'bg-blue-100 border-blue-400 font-semibold text-blue-900'
                  : 'border-gray-300 bg-white'
              }`}
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto flex-1 flex flex-col">
        <div
          ref={callEventsScrollRef}
          className="flex-1 overflow-y-auto"
          onScroll={handleCallEventsScroll}
        >
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Call SID / Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Direction</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayedCallEvents.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">No call events found</td>
                </tr>
              ) : (
                displayedCallEvents.map((event) => (
                  <tr key={event.event_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 text-center">{getCallStatusIcon(event)}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span
                          className="text-sm font-mono text-blue-600 cursor-pointer hover:underline"
                          onClick={() => fetchCallTimeline(event.call_sid)}
                        >
                          {event.call_sid}
                        </span>
                        <span className="text-xs text-gray-500 mt-1">{formatTimestamp(event.timestamp, selectedTimezone)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-block w-20 text-center px-2 py-1 text-xs font-medium rounded-full border ${getCallStatusColor(event.call_status)}`}>
                        {event.call_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{event.direction || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{event.from_number || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{event.to_number || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {showLoadMoreCalls && (
            <div className="px-6 py-2 border-t border-gray-200 flex justify-center">
              <button
                onClick={loadMoreCallEvents}
                disabled={loadingMoreCalls}
                className="px-4 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-full transition-colors flex items-center gap-2"
              >
                {loadingMoreCalls ? (
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
    </div>
  )
}

export default CallEventsPanel
