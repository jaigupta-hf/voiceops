import { AlertCircle, Phone, RefreshCw, Download, X, Check, Copy } from 'lucide-react'
import { formatEventType, formatTimestamp } from '../../utils/formatters'
import EventPayloadPanel from '../common/EventPayloadPanel'

function CallTimelineModal({
  selectedCallSid,
  closeTimeline,
  selectedPayload,
  setSelectedPayload,
  saveTimelineAsImage,
  loadingTimeline,
  callTimeline,
  conferenceTimeline,
  copyToClipboard,
  copiedId,
  getCallStatusColor,
  renderEventDetails,
  selectedTimezone,
  copyPayloadToClipboard,
  downloadPayload,
  timelineRef,
}) {
  if (!selectedCallSid) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={closeTimeline}>
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex" onClick={(e) => e.stopPropagation()}>
        <div className={`flex-1 flex flex-col ${selectedPayload ? 'max-w-[60%]' : 'w-full'}`}>
          <div className="px-6 py-1 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Call Trace</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={saveTimelineAsImage}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors"
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
                <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-6 border border-gray-200 shadow-sm">
                  <div className="space-y-4">
                    <span className="text-xs font-semibold text-gray-800">Account: {callTimeline.header.account_sid} </span>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold text-gray-800">Call SID: </span>
                      <code className="text-md bg-white px-4 py-1 rounded-full border border-gray-300 font-mono">
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
                        {callTimeline.header.from_number}{' -> '}{callTimeline.header.to_number}
                      </span>
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getCallStatusColor(callTimeline.header.final_status)}`}>
                        {callTimeline.header.final_status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300"></div>

                  {callTimeline.events.map((event, index) => (
                    <div key={`${event.category}-${index}`} className="relative pl-12 pb-4">
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
                              {formatTimestamp(event.timestamp, selectedTimezone)}
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

                  {callTimeline.events.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No events found for this call
                    </div>
                  )}
                </div>

                {conferenceTimeline && (
                  <div className="space-y-4 mt-4">
                    <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-6 border border-indigo-200 shadow-sm">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="text-base font-semibold text-gray-800">Conference SID: </span>
                          <code className="text-md bg-white px-4 py-1 rounded-full border border-gray-300 font-mono">
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

                        {conferenceTimeline.header.participant_count > 0 && (
                          <div className="space-y-2">
                            <span className="text-sm font-semibold text-gray-700">
                              Participants ({conferenceTimeline.header.participant_count}):
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {conferenceTimeline.header.participants.map((participant, idx) => (
                                <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-indigo-200">
                                  {participant.label && (
                                    <span className="text-xs font-medium text-indigo-700">
                                      {participant.label}
                                    </span>
                                  )}
                                  <span className="text-xs text-gray-600 font-mono">
                                    {participant.call_sid}
                                  </span>
                                  <button
                                    onClick={() => copyToClipboard(participant.call_sid)}
                                    className="p-0.5 hover:bg-indigo-100 rounded transition-colors"
                                    title="Copy Call SID"
                                  >
                                    {copiedId === participant.call_sid ? (
                                      <Check className="w-3 h-3 text-green-600" />
                                    ) : (
                                      <Copy className="w-3 h-3 text-gray-500" />
                                    )}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

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
                                  {formatTimestamp(event.timestamp, selectedTimezone)}
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

        <EventPayloadPanel
          selectedPayload={selectedPayload}
          copiedId={copiedId}
          onCopyPayload={copyPayloadToClipboard}
          onDownloadPayload={downloadPayload}
          onClose={() => setSelectedPayload(null)}
        />
      </div>
    </div>
  )
}

export default CallTimelineModal
