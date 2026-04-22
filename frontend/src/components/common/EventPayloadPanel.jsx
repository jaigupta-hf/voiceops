import { Copy, Check, Download, X } from 'lucide-react'

function EventPayloadPanel({ selectedPayload, copiedId, onCopyPayload, onDownloadPayload, onClose }) {
  if (!selectedPayload) {
    return null
  }

  return (
    <div className="w-[40%] border-l border-gray-300 flex flex-col bg-gray-50">
      <div className="px-4 py-2 border-b border-gray-300 flex items-center justify-between bg-white">
        <h3 className="text-lg font-semibold text-gray-900">Event Payload</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onCopyPayload}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors border border-gray-300"
            title="Copy to clipboard"
          >
            {copiedId === 'payload' ? (
              <>
                <Check className="w-3 h-3" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy
              </>
            )}
          </button>
          <button
            onClick={onDownloadPayload}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors"
            title="Download as JSON"
          >
            <Download className="w-3 h-3" />
            Download
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <pre className="bg-gray-900 text-green-400 p-4 rounded-xl text-xs font-mono overflow-x-auto">
          {JSON.stringify(selectedPayload, null, 2)}
        </pre>
      </div>
    </div>
  )
}

export default EventPayloadPanel
