import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Layers, Activity, CheckCircle, XCircle, Plus, FileText, MoreHorizontal, Download, Zap, Clock } from 'lucide-react'
import { Chart, registerables } from 'chart.js'
import Layout from '../components/Layout'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import { getMetrics } from '../api/metrics'
import { getAllJobs } from '../api/jobs'
import { usePolling } from '../hooks/usePolling'
import { formatDistanceToNow } from 'date-fns'

Chart.register(...registerables)

function timeAgo(dt) {
  try { return formatDistanceToNow(new Date(dt), { addSuffix: true }) } catch { return '—' }
}

function buildChartData(jobs) {
  var now   = new Date()
  var hours = []
  for (var i = 0; i < 12; i++) {
    var h = new Date(now)
    h.setHours(h.getHours() - (11 - i) * 2, 0, 0, 0)
    hours.push(h)
  }
  var labels    = hours.map(function(h) { return String(h.getHours()).padStart(2,'0') + ':00' })
  var processed = hours.map(function(h, i) {
    var next = hours[i + 1] || new Date()
    return jobs.filter(function(j) {
      var t = new Date(j.updatedAt)
      return t >= h && t < next && j.status === 'COMPLETED'
    }).length
  })
  var queued = hours.map(function(h, i) {
    var next = hours[i + 1] || new Date()
    return jobs.filter(function(j) {
      var t = new Date(j.createdAt)
      return t >= h && t < next && j.status === 'PENDING'
    }).length
  })
  return { labels: labels, processed: processed, queued: queued }
}

function ApiDocsModal({ onClose }) {
  var endpoints = [
    { method: 'POST', path: '/api/auth/register',    desc: 'Register new user'           },
    { method: 'POST', path: '/api/auth/login',        desc: 'Login and get JWT token'    },
    { method: 'GET',  path: '/api/jobs',              desc: 'List all jobs (?status=)'    },
    { method: 'POST', path: '/api/jobs',              desc: 'Create new job (multipart)'  },
    { method: 'GET',  path: '/api/jobs/:id',          desc: 'Get job by ID'               },
    { method: 'POST', path: '/api/jobs/:id/retry',    desc: 'Retry failed/cancelled job'  },
    { method: 'PUT',  path: '/api/jobs/:id/cancel',   desc: 'Cancel pending/processing'   },
    { method: 'GET',  path: '/api/workers',           desc: 'Get all workers'             },
    { method: 'POST', path: '/api/workers/register',  desc: 'Register worker (?name=)'    },
    { method: 'POST', path: '/api/workers/heartbeat', desc: 'Worker heartbeat'            },
    { method: 'GET',  path: '/api/metrics',           desc: 'System metrics'              },
  ]
  var mc = { GET: 'bg-emerald-100 text-emerald-700', POST: 'bg-blue-100 text-blue-700', PUT: 'bg-amber-100 text-amber-700' }
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">API Documentation</h2>
            <p className="text-xs text-slate-500 mt-0.5">Base URL: <span className="font-mono text-brand-600">http://localhost:8001/api</span></p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 text-slate-400">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 p-4">
          {endpoints.map(function(ep) {
            return (
              <div key={ep.path} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 border-b border-slate-50 last:border-0">
                <span className={'text-xs font-bold px-2 py-0.5 rounded w-14 text-center flex-shrink-0 ' + (mc[ep.method] || 'bg-slate-100 text-slate-600')}>{ep.method}</span>
                <code className="text-xs font-mono text-slate-700 flex-1">{ep.path}</code>
                <span className="text-xs text-slate-500">{ep.desc}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  var [metrics,  setMetrics]  = useState(null)
  var [allJobs,  setAllJobs]  = useState([])   // ALL jobs — not sliced
  var [showDocs, setShowDocs] = useState(false)
  var chartRef      = useRef(null)
  var chartInstance = useRef(null)

  function fetchAll() {
    Promise.all([getMetrics(), getAllJobs()])
      .then(function(results) {
        setMetrics(results[0].data)
        setAllJobs(results[1].data)
        if (chartInstance.current) {
          var d = buildChartData(results[1].data)
          chartInstance.current.data.labels           = d.labels
          chartInstance.current.data.datasets[0].data = d.processed
          chartInstance.current.data.datasets[1].data = d.queued
          chartInstance.current.update('none')
        }
      })
      .catch(function() {})
  }

  usePolling(fetchAll, 8000)

  useEffect(function() {
    if (!chartRef.current) return
    if (chartInstance.current) chartInstance.current.destroy()
    chartInstance.current = new Chart(chartRef.current, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          { label: 'Processed', data: [], borderColor: '#3b3fe4', backgroundColor: 'rgba(59,63,228,0.08)', borderWidth: 2, fill: true, tension: 0.4, pointRadius: 0 },
          { label: 'Queued',    data: [], borderColor: '#94a3b8', backgroundColor: 'transparent', borderWidth: 1.5, fill: false, tension: 0.4, pointRadius: 0, borderDash: [4,3] },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#94a3b8' } },
          y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 }, color: '#94a3b8' }, beginAtZero: true },
        }
      }
    })
    return function() { if (chartInstance.current) chartInstance.current.destroy() }
  }, [])

  function exportChart() {
    if (!chartRef.current) return
    var a = document.createElement('a')
    a.href = chartRef.current.toDataURL('image/png')
    a.download = 'job-activity.png'
    a.click()
  }

  // ── Top 3 job types from ALL jobs ─────────────────────────────────────────
  var top3Types = (function() {
    var counts = {}
    allJobs.forEach(function(j) {
      counts[j.jobType] = (counts[j.jobType] || 0) + 1
    })
    return Object.entries(counts)
      .sort(function(a, b) { return b[1] - a[1] })
      .slice(0, 3)  // TOP 3 ONLY
      .map(function(entry) {
        return {
          type:  entry[0],
          count: entry[1],
          pct:   allJobs.length ? Math.round((entry[1] / allJobs.length) * 100) : 0,
        }
      })
  })()

  // ── Real engine stats ─────────────────────────────────────────────────────
  var avgProcessing = (function() {
    var done = allJobs.filter(function(j) { return j.processingTime })
    if (!done.length) return null
    return (done.reduce(function(s,j) { return s + j.processingTime }, 0) / done.length / 1000).toFixed(1)
  })()

  var lastJob = allJobs.length > 0
    ? allJobs.reduce(function(a, b) { return new Date(a.createdAt) > new Date(b.createdAt) ? a : b })
    : null

  // Recent 5 jobs for table
  var recentJobs = allJobs.slice(0, 5)

  var stats = [
    { icon: Layers,      label: 'Total Jobs',  value: metrics ? metrics.totalJobs      : '—', iconBg: 'bg-brand-50',  iconColor: 'text-brand-500' },
    { icon: Activity,    label: 'Processing',  value: metrics ? metrics.processingJobs : '—', iconBg: 'bg-blue-50',   iconColor: 'text-blue-500'  },
    { icon: CheckCircle, label: 'Completed',   value: metrics ? metrics.completedJobs  : '—', iconBg: 'bg-green-50',  iconColor: 'text-green-600' },
    { icon: XCircle,     label: 'Failed',      value: metrics ? metrics.failedJobs     : '—', iconBg: 'bg-red-50',    iconColor: 'text-red-500'   },
  ]

  return (
    <Layout>
      {showDocs && <ApiDocsModal onClose={function() { setShowDocs(false) }} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">System Dashboard</h1>
          <p className="page-subtitle">
            {lastJob ? 'Last job ' + timeAgo(lastJob.createdAt) + ' · ' : ''}
            {allJobs.length} total jobs processed
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={function() { setShowDocs(true) }} className="btn-secondary">
            <FileText size={15} /> API Docs
          </button>
          <Link to="/create-job" className="btn-primary">
            <Plus size={15} /> New AI Job
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(function(s) { return <StatCard key={s.label} {...s} /> })}
      </div>

      {/* Chart */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="section-title">Job Processing Activity</h2>
            <p className="text-xs text-slate-500 mt-0.5">Completed vs queued jobs per 2-hour window (today).</p>
          </div>
          <div className="flex gap-2">
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <span className="live-dot" /> Live
            </span>
            <button onClick={exportChart} className="btn-secondary text-xs py-1.5 gap-1.5">
              <Download size={13} /> Export
            </button>
          </div>
        </div>
        <div style={{ height: 220 }}><canvas ref={chartRef} /></div>
        <div className="flex gap-5 mt-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-2.5 h-2.5 rounded-sm bg-brand-500" />Processed</div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-2.5 h-2.5 rounded-sm bg-slate-300" />Queued</div>
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Jobs table */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <div>
              <h2 className="section-title">Recent Jobs</h2>
              <p className="text-xs text-slate-500 mt-0.5">Latest 5 tasks submitted to the queue.</p>
            </div>
            <Link to="/jobs" className="text-xs text-brand-500 font-semibold hover:text-brand-600">View All →</Link>
          </div>
          {recentJobs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No jobs yet — <Link to="/create-job" className="text-brand-500">create one</Link>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-[1fr_1.2fr_1fr_1fr_auto] gap-4 px-5 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-50">
                <span>Job ID</span><span>Type</span><span>Status</span><span>Worker</span><span></span>
              </div>
              {recentJobs.map(function(job) {
                return (
                  <div key={job.id} className="grid grid-cols-[1fr_1.2fr_1fr_1fr_auto] gap-4 px-5 py-3.5 items-center border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                    <Link to={'/jobs/' + job.id} className="text-sm font-semibold text-brand-500 hover:text-brand-600">
                      JOB-{String(job.id).padStart(4,'0')}
                    </Link>
                    <span className="text-sm text-slate-700 truncate">{job.jobType.replace(/_/g,' ')}</span>
                    <StatusBadge status={job.status} />
                    <span className="text-sm text-slate-500">{job.workerId ? 'Node-'+job.workerId : '—'}</span>
                    <button className="btn-ghost p-1.5" title="More options" aria-label="More options"><MoreHorizontal size={14} /></button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right panel — real data only */}
        <div className="flex flex-col gap-4">

          {/* Top 3 job types — real from ALL jobs */}
          <div className="card p-5">
            <h2 className="section-title mb-1">Top Job Types</h2>
            <p className="text-xs text-slate-500 mb-4">
              Most used AI tasks — top 3 of {Object.keys((function() {
                var c = {}; allJobs.forEach(function(j) { c[j.jobType] = 1 }); return c
              })()).length} types.
            </p>
            {top3Types.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No jobs yet</p>
            ) : (
              top3Types.map(function(item, idx) {
                var colors = ['bg-brand-500', 'bg-violet-500', 'bg-emerald-500']
                var textColors = ['text-brand-600', 'text-violet-600', 'text-emerald-600']
                var bgColors = ['bg-brand-50', 'bg-violet-50', 'bg-emerald-50']
                return (
                  <div key={item.type} className="mb-4 last:mb-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={'text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center text-white flex-shrink-0 ' + colors[idx]}>
                          {idx + 1}
                        </span>
                        <span className="text-sm font-semibold text-slate-700 truncate">
                          {item.type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <span className={'text-xs font-bold px-2 py-0.5 rounded-full ' + bgColors[idx] + ' ' + textColors[idx]}>
                        {item.count} jobs
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={'h-full rounded-full transition-all duration-700 ' + colors[idx]}
                        style={{ width: item.pct + '%' }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{item.pct}% of all jobs</p>
                  </div>
                )
              })
            )}
          </div>

          {/* Engine status — real data only, no fake CPU/RAM */}
          <div className="card p-5">
            <h2 className="section-title mb-4"><Zap size={14} /> Engine Status</h2>
            {[
              {
                label: 'Queue Status',
                value: (metrics && metrics.queueSize > 0)
                  ? metrics.queueSize + ' pending'
                  : 'Clear',
                color: (metrics && metrics.queueSize > 0) ? 'text-amber-600' : 'text-emerald-600',
              },
              {
                label: 'Success Rate',
                value: metrics && metrics.totalJobs > 0
                  ? ((metrics.completedJobs / metrics.totalJobs) * 100).toFixed(1) + '%'
                  : '—',
                color: 'text-slate-700',
              },
              {
                label: 'Avg Duration',
                value: avgProcessing ? avgProcessing + 's' : '—',
                color: 'text-slate-700',
              },
              {
                label: 'Last Job',
                value: lastJob ? timeAgo(lastJob.createdAt) : 'None yet',
                color: 'text-slate-700',
              },
              {
                label: 'Scheduled',
                value: metrics && metrics.scheduledJobs > 0
                  ? metrics.scheduledJobs + ' queued'
                  : 'None',
                color: metrics && metrics.scheduledJobs > 0 ? 'text-amber-600' : 'text-slate-500',
              },
            ].map(function(item) {
              return (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <span className="text-xs text-slate-500">{item.label}</span>
                  <span className={'text-xs font-semibold ' + item.color}>{item.value}</span>
                </div>
              )
            })}
          </div>

        </div>
      </div>
    </Layout>
  )
}