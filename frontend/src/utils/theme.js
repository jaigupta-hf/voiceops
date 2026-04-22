export function getCallStatusColor(status) {
  const statusMap = {
    queued: 'bg-gray-50 text-gray-700 border-gray-200',
    initiated: 'bg-blue-50 text-blue-700 border-blue-200',
    ringing: 'bg-amber-50 text-amber-700 border-amber-200',
    busy: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'in-progress': 'bg-cyan-50 text-cyan-700 border-cyan-200',
    'no-answer': 'bg-rose-50 text-rose-700 border-rose-200',
    canceled: 'bg-slate-50 text-slate-700 border-slate-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
    'conference-start': 'bg-blue-50 text-blue-700 border-blue-200',
    'conference-end': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'participant-join': 'bg-cyan-50 text-cyan-700 border-cyan-200',
    'participant-leave': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  }
  return statusMap[status?.toLowerCase()] || 'bg-gray-50 text-gray-700 border-gray-200'
}

export function getSeverityColor(severity) {
  const colors = {
    ERROR: 'bg-red-50 text-red-700 border-red-200',
    WARNING: 'bg-amber-50 text-amber-700 border-amber-200',
    INFO: 'bg-blue-50 text-blue-700 border-blue-200',
  }
  return colors[severity] || 'bg-gray-50 text-gray-700 border-gray-200'
}
