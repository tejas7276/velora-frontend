import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Plus, RotateCcw, MoreHorizontal, ListTodo, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import Layout from '../components/Layout'
import StatusBadge from '../components/StatusBadge'
import ProgressBar from '../components/ProgressBar'
import EmptyState from '../components/EmptyState'
import { getAllJobs } from '../api/jobs'
import { usePolling } from '../hooks/usePolling'
import { useJobNotifications } from '../hooks/useJobNotifications'
import { formatDistanceToNow } from 'date-fns'

function timeAgo(dt) {
  try { return formatDistanceToNow(new Date(dt), { addSuffix: true }) } catch { return '—' }
}

const STATUSES = ['All', 'PENDING', 'SCHEDULED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED']
const PAGE_SIZE = 10

export default function JobsMonitoring() {
  const [jobs,         setJobs]   = useState([])
  const [statusFilter, setStatus] = useState('All')
  const [search,       setSearch] = useState('')
  const [page,         setPage]   = useState(0)  // Feature 4 — pagination

  usePolling(async () => {
    try {
      const r = await getAllJobs(statusFilter === 'All' ? null : statusFilter)
      setJobs(r.data)
    } catch(e) {}
  }, 6000, true)

  useJobNotifications(jobs)

  const handleStatusChange = async (val) => {
    setStatus(val)
    setPage(0) // reset to first page on filter change
    try {
      const r = await getAllJobs(val === 'All' ? null : val)
      setJobs(r.data)
    } catch(e) {}
  }

  const exportCSV = () => {
    const rows = [
      ['Job ID','Type','Status','Worker','Duration','Model','Created'],
      ...filtered.map(j => [
        'JOB-'+String(j.id).padStart(4,'0'),
        j.jobType,
        j.status,
        j.workerId ? 'Node-'+j.workerId : '—',
        j.processingTime ? (j.processingTime/1000).toFixed(2)+'s' : '—',
        j.aiModel || 'default',
        new Date(j.createdAt).toLocaleString(),
      ])
    ]
    const csv  = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = 'jobs-export.csv'
    a.click()
  }

  const filtered = jobs.filter(j =>
    search === '' ||
    String(j.id).includes(search) ||
    j.jobType.toLowerCase().includes(search.toLowerCase())
  )

  // Feature 4 — pagination
  const totalPages   = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated    = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const startItem    = page * PAGE_SIZE + 1
  const endItem      = Math.min((page + 1) * PAGE_SIZE, filtered.length)

  // Unique stats
  const processing   = jobs.filter(j => j.status === 'PROCESSING').length
  const scheduled    = jobs.filter(j => j.status === 'SCHEDULED').length
  const cancelled    = jobs.filter(j => j.status === 'CANCELLED').length
  const avgLatency   = (function() {
    const done = jobs.filter(j => j.processingTime)
    return done.length > 0 ? Math.round(done.reduce((s,j) => s+j.processingTime, 0) / done.length) : 0
  })()
  const oldestPending = (function() {
    const pending = jobs.filter(j => j.status === 'PENDING')
    if (!pending.length) return 'None'
    const oldest = pending.reduce((a,b) => new Date(a.createdAt) < new Date(b.createdAt) ? a : b)
    return timeAgo(oldest.createdAt)
  })()

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Jobs Monitoring</h1>
          <p className="page-subtitle">Manage, filter, retry and export your background AI tasks.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn-secondary"><Download size={14} /> Export CSV</button>
          <Link to="/create-job" className="btn-primary"><Plus size={14} /> New Job</Link>
        </div>
      </div>

      {/* Unique stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'RUNNING NOW',      value: processing,   color: processing > 0 ? 'text-blue-600' : 'text-slate-900',  sub: 'Active right now'    },
          { label: 'SCHEDULED',        value: scheduled,    color: scheduled > 0  ? 'text-amber-600': 'text-slate-900',  sub: 'Waiting for time'    },
          { label: 'OLDEST PENDING',   value: oldestPending,color: 'text-slate-700',                                      sub: 'Waiting in queue'    },
          { label: 'AVG DURATION',     value: avgLatency > 0 ? avgLatency+'ms' : '—', color: 'text-slate-900',           sub: 'Processing time'     },
          { label: 'CANCELLED',        value: cancelled,    color: cancelled > 0  ? 'text-slate-600': 'text-slate-900',  sub: 'Stopped by user'     },
        ].map(function(s) {
          return (
            <div key={s.label} className="card p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{s.label}</p>
              <p className={'text-xl font-bold ' + s.color}>{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
            </div>
          )
        })}
      </div>

      {/* Failed jobs quick action */}
      {jobs.filter(j => j.status === 'FAILED').length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertTriangle size={15} />
            <span><strong>{jobs.filter(j => j.status === 'FAILED').length} failed jobs</strong> need attention</span>
          </div>
          <button
            onClick={() => handleStatusChange('FAILED')}
            className="text-xs text-red-500 font-semibold border border-red-200 px-3 py-1 rounded-lg hover:bg-red-100"
          >
            Show Failed
          </button>
        </div>
      )}

      {/* Scheduled jobs info */}
      {scheduled > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-amber-700">
            <span>⏰</span>
            <span><strong>{scheduled} job(s)</strong> are scheduled to run at a future time</span>
          </div>
          <button
            onClick={() => handleStatusChange('SCHEDULED')}
            className="text-xs text-amber-600 font-semibold border border-amber-200 px-3 py-1 rounded-lg hover:bg-amber-100"
          >
            View Scheduled
          </button>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <div className="flex items-center gap-3 p-4 border-b border-slate-100 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input className="input pl-9" placeholder="Search Job ID or type..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(0) }} />
          </div>
          <select className="input w-auto" value={statusFilter} onChange={e => handleStatusChange(e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
          </select>
          <button onClick={() => { handleStatusChange('All'); setSearch(''); setPage(0) }} className="btn-ghost text-xs">
            <RotateCcw size={13} /> Reset
          </button>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[0.7fr_1.2fr_1fr_1.1fr_0.7fr_0.7fr_0.6fr_auto] gap-3 px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-slate-50/50">
          <span>Job ID</span>
          <span>Type</span>
          <span>Status</span>
          <span>Progress</span>
          <span>Duration</span>
          <span>Model</span>
          <span>Created</span>
          <span></span>
        </div>

        {paginated.length === 0 ? (
          <EmptyState icon={ListTodo} title="No jobs found" description="No jobs match your current filters.">
            <Link to="/create-job" className="btn-primary">Create First Job</Link>
          </EmptyState>
        ) : (
          paginated.map(function(job) {
            return (
              <div key={job.id} className="grid grid-cols-[0.7fr_1.2fr_1fr_1.1fr_0.7fr_0.7fr_0.6fr_auto] gap-3 px-5 py-3.5 items-center border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                <Link to={'/jobs/'+job.id} className="text-sm font-semibold text-brand-500 hover:text-brand-600">
                  JOB-{String(job.id).padStart(4,'0')}
                </Link>
                <span className="text-xs text-slate-700 truncate">{job.jobType.replace(/_/g,' ')}</span>
                <StatusBadge status={job.status} />
                <ProgressBar status={job.status} />
                <span className="text-xs text-slate-500">
                  {job.processingTime ? (job.processingTime/1000).toFixed(1)+'s' : '—'}
                </span>
                <span className="text-xs text-slate-400 truncate">
                  {job.aiModel ? job.aiModel.includes('8b') ? 'Fast' : 'Balanced' : 'Default'}
                </span>
                <span className="text-xs text-slate-400">{timeAgo(job.createdAt)}</span>
                <button className="btn-ghost p-1.5" title="More options" aria-label="More options"><MoreHorizontal size={14} /></button>
              </div>
            )
          })
        )}

        {/* Feature 4 — Pagination */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
            <span className="text-sm text-slate-500">
              {filtered.length > 0
                ? `Showing ${startItem}–${endItem} of ${filtered.length} jobs`
                : 'No jobs'
              }
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className={'btn-secondary text-xs py-1.5 px-3 gap-1 ' + (page === 0 ? 'opacity-40 cursor-not-allowed' : '')}
              >
                <ChevronLeft size={13} /> Prev
              </button>

              {/* Page number pills */}
              <div className="flex gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  var pageNum = totalPages <= 5 ? i : Math.max(0, Math.min(page - 2, totalPages - 5)) + i
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={
                        'w-8 h-8 rounded-lg text-xs font-semibold transition-colors ' +
                        (page === pageNum
                          ? 'bg-brand-500 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                      }
                    >
                      {pageNum + 1}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className={'btn-secondary text-xs py-1.5 px-3 gap-1 ' + (page >= totalPages - 1 ? 'opacity-40 cursor-not-allowed' : '')}
              >
                Next <ChevronRight size={13} />
              </button>
            </div>

            <button onClick={exportCSV} className="text-xs text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1">
              <Download size={12} /> Export CSV
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}