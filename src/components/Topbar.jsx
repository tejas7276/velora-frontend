import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Bell, X, CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import { getAllJobs } from '../api/jobs'
import { formatDistanceToNow } from 'date-fns'

function timeAgo(dt) {
  try { return formatDistanceToNow(new Date(dt), { addSuffix: true }) } catch { return '' }
}

const TYPE_ICON = {
  success: <CheckCircle  className="w-4 h-4 text-emerald-500 flex-shrink-0" />,
  error:   <XCircle      className="w-4 h-4 text-red-500 flex-shrink-0" />,
  warning: <AlertCircle  className="w-4 h-4 text-amber-500 flex-shrink-0" />,
  info:    <Info         className="w-4 h-4 text-brand-400 flex-shrink-0" />,
}

export default function Topbar() {
  const { user }  = useAuth()
  const { notifications, clearAll, dismiss } = useNotifications()
  const navigate  = useNavigate()

  const [showBell,  setShowBell]  = useState(false)
  const [search,    setSearch]    = useState('')
  const [results,   setResults]   = useState([])
  const [searching, setSearching] = useState(false)
  const bellRef   = useRef(null)
  const searchRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setShowBell(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!search.trim()) { setResults([]); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const r        = await getAllJobs()
        const filtered = r.data.filter(j =>
          String(j.id).includes(search) ||
          j.jobType.toLowerCase().includes(search.toLowerCase()) ||
          j.status.toLowerCase().includes(search.toLowerCase())
        ).slice(0, 5)
        setResults(filtered)
      } catch {}
      setSearching(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const unread = notifications.length

  var userInitial = (user?.name || user?.email || 'U')[0].toUpperCase()

  return (
    <header className="topbar">
      {/* Search */}
      <div className="relative flex-1 max-w-sm" ref={searchRef}>
        <div className="input-icon">
          <Search />
          <input
            className="input"
            placeholder="Search jobs, workers, or metrics..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onBlur={() => setTimeout(() => setResults([]), 200)}
          />
        </div>
        {(results.length > 0 || searching) && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
            {searching ? (
              <div className="px-4 py-3 text-xs text-slate-400">Searching...</div>
            ) : results.map(job => (
              <button key={job.id}
                onMouseDown={() => { navigate('/jobs/' + job.id); setSearch('') }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-700">JOB-{String(job.id).padStart(4,'0')}</p>
                  <p className="text-xs text-slate-400">{job.jobType} · {job.status}</p>
                </div>
                <span className={
                  'text-xs font-medium px-2 py-0.5 rounded-full ' +
                  (job.status === 'COMPLETED'  ? 'bg-green-100 text-green-700'  :
                   job.status === 'FAILED'     ? 'bg-red-100 text-red-600'      :
                   job.status === 'PROCESSING' ? 'bg-blue-100 text-blue-700'    :
                   'bg-slate-100 text-slate-500')
                }>{job.status}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Bell */}
      <div className="relative" ref={bellRef}>
        <button onClick={() => setShowBell(v => !v)}
          className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <Bell className="w-5 h-5 text-slate-500" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-brand-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {showBell && (
          <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-800">Notifications</span>
              {unread > 0 && (
                <button onClick={clearAll} className="text-xs text-brand-500 hover:text-brand-600 font-medium">
                  Clear all
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-400">No notifications yet</div>
              ) : notifications.map(n => (
                <div key={n.id} className="flex items-start gap-3 px-4 py-3 border-b border-slate-50 hover:bg-slate-50">
                  {TYPE_ICON[n.type] || TYPE_ICON.info}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-700 leading-relaxed">{n.msg}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo(n.time)}</p>
                  </div>
                  <button onClick={() => dismiss(n.id)} className="text-slate-300 hover:text-slate-500 flex-shrink-0">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* User */}
      <div className="flex items-center gap-2.5 pl-3 border-l border-slate-100">
        <div className="text-right">
          <p
            onClick={() => navigate("/settings")}
            className="text-sm font-semibold text-slate-800 leading-tight cursor-pointer"
          >
            {user?.name || 'User'}
          </p>
          {user?.email && (
            <p className="text-xs text-slate-400 truncate max-w-[120px]">{user.email}</p>
          )}
        </div>
        {user?.avatar ? (
          <img
            src={user.avatar}
            alt="avatar"
            onClick={() => navigate("/settings")}
            className="w-8 h-8 rounded-full object-cover flex-shrink-0 cursor-pointer"
          />
        ) : (
          <div
            onClick={() => navigate("/settings")}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 cursor-pointer"
          >
            {userInitial}
          </div>
        )}
      </div>
    </header>
  )
}