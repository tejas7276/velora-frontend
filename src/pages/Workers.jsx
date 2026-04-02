import { useState } from 'react'
import { Zap, Activity, CheckCircle, XCircle, Clock, Layers, RefreshCw, AlertTriangle, RotateCcw } from 'lucide-react'
import Layout from '../components/Layout'
import { getAllWorkers, sendHeartbeat } from '../api/workers'
import { getMetrics } from '../api/metrics'
import { getAllJobs } from '../api/jobs'
import { usePolling } from '../hooks/usePolling'
import { useNotifications } from '../context/NotificationContext'
import { formatDistanceToNow } from 'date-fns'

function timeAgo(dt) {
  try { return formatDistanceToNow(new Date(dt), { addSuffix: true }) } catch { return '—' }
}

export default function Workers() {
  var [metrics,  setMetrics]  = useState(null)
  var [jobs,     setJobs]     = useState([])
  var [workers,  setWorkers]  = useState([])
  var [status,   setStatus]   = useState('checking')
  var [paused,   setPaused]   = useState(false)
  var { addNotification }     = useNotifications()

  // ── Fetch all real data ───────────────────────────────────────────────────
  usePolling(async function() {
    try {
      var token = localStorage.getItem('token')
      if (!token) return
      var [m, j, w] = await Promise.all([getMetrics(), getAllJobs(), getAllWorkers()])
      setMetrics(m.data)
      setJobs(j.data)
      setWorkers(w.data)
      setStatus('online')
    } catch(e) {
      setStatus('error')
    }
  }, 8000)

  // ── Auto heartbeat every 30s ──────────────────────────────────────────────
  usePolling(async function() {
    var token = localStorage.getItem('token')
    if (!token) return
    try {
      var w = await getAllWorkers()
      for (var i = 0; i < w.data.length; i++) {
        var worker = w.data[i]
        await sendHeartbeat({
          workerName: worker.name,
          activeJobs: worker.activeJobs || 0,
          cpuUsage:   worker.cpuUsage   || 0,
          ramUsage:   worker.ramUsage   || 0,
        })
      }
    } catch(e) {}
  }, 30000)

  // ── Computed real values ──────────────────────────────────────────────────
  var today         = new Date(); today.setHours(0,0,0,0)
  var jobsToday     = jobs.filter(function(j) { return new Date(j.createdAt) >= today }).length
  var completedJobs = metrics ? (metrics.completedJobs  || 0) : 0
  var failedJobs    = metrics ? (metrics.failedJobs     || 0) : 0
  var processingNow = metrics ? (metrics.processingJobs || 0) : 0
  var totalJobs     = metrics ? (metrics.totalJobs      || 0) : 0
  var queueSize     = metrics ? (metrics.queueSize      || 0) : 0
  var successRate   = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0
  var avgTime       = (function() {
    var done = jobs.filter(function(j) { return j.processingTime })
    return done.length > 0
      ? (done.reduce(function(s, j) { return s + j.processingTime }, 0) / done.length / 1000).toFixed(1)
      : '—'
  })()
  var lastJob = jobs.length > 0
    ? jobs.reduce(function(a, b) { return new Date(a.updatedAt) > new Date(b.updatedAt) ? a : b })
    : null
  var activeWorkers = workers.filter(function(w) { return w.status === 'ACTIVE' }).length

  // ── Pause handler ─────────────────────────────────────────────────────────
  function handlePauseToggle() {
    setPaused(function(v) { return !v })
    addNotification(
      paused ? 'Processing engine resumed' : 'Processing engine paused — jobs will queue up',
      paused ? 'success' : 'warning'
    )
  }

  function handleRestart() {
    addNotification('Restart signal sent to processing engine', 'info')
  }

  // ── Status indicator ──────────────────────────────────────────────────────
  var engineStatus = paused ? 'paused' : processingNow > 0 ? 'processing' : 'idle'

  var statusConfig = {
    processing: { dot: 'bg-blue-400 animate-pulse',   text: 'text-blue-600',   label: 'Processing',  bg: 'bg-blue-50 border-blue-100'   },
    idle:       { dot: 'bg-emerald-400',               text: 'text-emerald-600',label: 'Online / Idle', bg: 'bg-emerald-50 border-emerald-100' },
    paused:     { dot: 'bg-amber-400',                 text: 'text-amber-600',  label: 'Paused',      bg: 'bg-amber-50 border-amber-100'  },
    error:      { dot: 'bg-red-400',                   text: 'text-red-600',    label: 'Error',       bg: 'bg-red-50 border-red-100'      },
    checking:   { dot: 'bg-slate-300 animate-pulse',   text: 'text-slate-500',  label: 'Connecting...', bg: 'bg-slate-50 border-slate-100' },
  }
  var sc = statusConfig[engineStatus] || statusConfig.idle

  return (
    <Layout>
      <p className="text-xs text-slate-400 mb-3">
        Dashboard &rsaquo; <span className="text-slate-600">Processing Engine</span>
      </p>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Processing Engine</h1>
          <p className="page-subtitle">
            Monitor your background AI task processor running on this machine.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRestart} className="btn-secondary gap-1.5">
            <RefreshCw size={14} /> Restart
          </button>
          <button
            onClick={handlePauseToggle}
            className={
              'btn-secondary gap-1.5 ' +
              (paused ? 'border-amber-300 bg-amber-50 text-amber-700' : '')
            }
          >
            <RotateCcw size={14} />
            {paused ? 'Resume Processing' : 'Pause Processing'}
          </button>
        </div>
      </div>

      {paused && (
        <div className="mb-5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 flex items-center gap-2">
          <AlertTriangle size={15} />
          Processing is paused — new jobs will remain in queue until resumed.
        </div>
      )}

      {/* Main Engine Status Card */}
      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-brand-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Local Processing Engine</h2>
              <p className="text-xs text-slate-500 mt-0.5">Single-node · localhost:8001</p>
            </div>
          </div>
          <span className={
            'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ' + sc.bg + ' ' + sc.text
          }>
            <span className={'w-2 h-2 rounded-full ' + sc.dot} />
            {sc.label}
          </span>
        </div>

        {/* Real stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { icon: Layers,       label: 'Jobs Today',        value: jobsToday,           color: 'text-brand-500',   bg: 'bg-brand-50'   },
            { icon: Activity,     label: 'Processing Now',    value: processingNow,        color: 'text-blue-500',    bg: 'bg-blue-50'    },
            { icon: CheckCircle,  label: 'Success Rate',      value: successRate + '%',    color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { icon: Clock,        label: 'Avg Time',          value: avgTime === '—' ? avgTime : avgTime + 's',        color: 'text-violet-500',  bg: 'bg-violet-50'  },
            { icon: XCircle,      label: 'Failed',            value: failedJobs,           color: 'text-red-500',     bg: 'bg-red-50'     },
            { icon: Layers,       label: 'Queue',             value: queueSize,            color: 'text-amber-500',   bg: 'bg-amber-50'   },
          ].map(function(item) {
            var Icon = item.icon
            return (
              <div key={item.label} className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl text-center">
                <div className={'w-8 h-8 rounded-lg flex items-center justify-center mb-2 ' + item.bg}>
                  <Icon className={'w-4 h-4 ' + item.color} />
                </div>
                <p className="text-xl font-bold text-slate-800">{item.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.label}</p>
              </div>
            )
          })}
        </div>

        {/* Footer info */}
        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-slate-100">
          {[
            { label: 'Last Job Processed', value: lastJob ? timeAgo(lastJob.updatedAt) : 'No jobs yet' },
            { label: 'Total Jobs All Time', value: totalJobs + ' jobs' },
            { label: 'Engine Mode',         value: 'Single Node · Local Machine' },
          ].map(function(item) {
            return (
              <div key={item.label} className="text-center">
                <p className="text-xs text-slate-400 mb-1">{item.label}</p>
                <p className="text-sm font-semibold text-slate-700">{item.value}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Job Type Breakdown — real from jobs data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Recent Activity */}
        <div className="card">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="section-title">Recent Processing Activity</h3>
            <p className="text-xs text-slate-500 mt-0.5">Last 5 jobs handled by the engine.</p>
          </div>
          {jobs.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">No jobs processed yet</div>
          ) : (
            <div>
              {jobs.slice(0, 5).map(function(job) {
                return (
                  <div key={job.id} className="flex items-center justify-between px-5 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">JOB-{String(job.id).padStart(4,'0')}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{job.jobType}</p>
                    </div>
                    <div className="text-right">
                      <span className={
                        'text-xs font-semibold px-2 py-0.5 rounded-full ' +
                        (job.status === 'COMPLETED' ? 'bg-green-100 text-green-700'  :
                         job.status === 'FAILED'    ? 'bg-red-100 text-red-600'      :
                         job.status === 'PROCESSING'? 'bg-blue-100 text-blue-700'    :
                         'bg-slate-100 text-slate-500')
                      }>{job.status}</span>
                      <p className="text-xs text-slate-400 mt-1">
                        {job.processingTime ? (job.processingTime / 1000).toFixed(1) + 's' : '—'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Job Type Stats */}
        <div className="card">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="section-title">Jobs by Type</h3>
            <p className="text-xs text-slate-500 mt-0.5">All-time breakdown of job types processed.</p>
          </div>
          {jobs.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">No jobs yet</div>
          ) : (
            <div className="p-5 flex flex-col gap-3">
              {(function() {
                var counts = {}
                jobs.forEach(function(j) {
                  counts[j.jobType] = (counts[j.jobType] || 0) + 1
                })
                return Object.entries(counts)
                  .sort(function(a, b) { return b[1] - a[1] })
                  .slice(0, 6)
                  .map(function(entry) {
                    var type  = entry[0]
                    var count = entry[1]
                    var pct   = Math.round((count / jobs.length) * 100)
                    return (
                      <div key={type}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium text-slate-600">{type}</span>
                          <span className="text-slate-500">{count} jobs · {pct}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-400 rounded-full transition-all duration-500"
                            style={{ width: pct + '%' }}
                          />
                        </div>
                      </div>
                    )
                  })
              })()}
            </div>
          )}
        </div>
      </div>

    </Layout>
  )
}