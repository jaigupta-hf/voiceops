import { LogOut } from 'lucide-react'

function DashboardHeader({
  selectedAccountSid,
  setSelectedAccountSid,
  uniqueAccountSids,
  selectedTimezone,
  setSelectedTimezone,
  user,
  logout,
  wsConnected,
}) {
  return (
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
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Timezone:</label>
              <select
                value={selectedTimezone}
                onChange={(e) => setSelectedTimezone(e.target.value)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="IST">IST</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              {user?.email}
            </span>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
            <span className={`px-3 py-1.5 text-sm font-medium rounded-full ${wsConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {wsConnected ? '● Live' : '● Disconnected'}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}

export default DashboardHeader
