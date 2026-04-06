import { useState, useEffect, useRef } from 'react'
import { Activity, Layers, AlertTriangle, RefreshCw, Download, Clock } from 'lucide-react'
import { Chart, registerables } from 'chart.js'
import Layout from '../components/Layout'
import { getMetrics } from '../api/metrics'
import { getAllJobs } from '../api/jobs'
import { usePolling } from '../hooks/usePolling'

Chart.register(...registerables)

function nowLabel() {
  return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function rangeToMs(r) {
  if (r === '1h')  return 1  * 60 * 60 * 1000
  if (r === '6h')  return 6  * 60 * 60 * 1000
  if (r === '24h') return 24 * 60 * 60 * 1000
  if (r === '7d')  return 7  * 24 * 60 * 60 * 1000
  if (r === '30d') return 30 * 24 * 60 * 60 * 1000
  return 60 * 60 * 1000
}

function rangeLabel(r) {
  if (r === '1h')  return 'Last 1 Hour'
  if (r === '6h')  return 'Last 6 Hours'
  if (r === '24h') return 'Last 24 Hours'
  if (r === '7d')  return 'Last 7 Days'
  if (r === '30d') return 'Last 30 Days'
  return 'Last 1 Hour'
}

export default function SystemMetrics() {
  var [metrics,    setMetrics]    = useState(null)
  var [allJobs,    setAllJobs]    = useState([])
  var [range,      setRange]      = useState('1h')
  var [lastUpdate, setLastUpdate] = useState('')

  var throughputRef   = useRef(null)
  var latencyRef      = useRef(null)
  var queueRef        = useRef(null)
  var throughputChart = useRef(null)
  var latencyChart    = useRef(null)
  var queueChart      = useRef(null)
  var chartsReady     = useRef(false)

  // Fetch real data
  function fetchAll() {
    Promise.all([getMetrics(), getAllJobs()])
      .then(function(results) {
        setMetrics(results[0].data)
        setAllJobs(results[1].data)
        setLastUpdate(nowLabel())
      })
      .catch(function() {})
  }

  usePolling(fetchAll, 10000)

  // Filter jobs by selected time range
  var cutoff       = new Date(Date.now() - rangeToMs(range))
  var jobs         = allJobs.filter(function(j) { return new Date(j.createdAt + 'Z') >= cutoff })
  var completed    = jobs.filter(function(j) { return j.status === 'COMPLETED' })
  var failed       = jobs.filter(function(j) { return j.status === 'FAILED' })
  var totalInRange = jobs.length

  var successRate = totalInRange > 0
    ? ((completed.length / totalInRange) * 100).toFixed(1)
    : '0.0'

  var errorRate = totalInRange > 0
    ? ((failed.length / totalInRange) * 100).toFixed(2)
    : '0.00'

  var avgProcessing = (function() {
    var done = jobs.filter(function(j) { return j.processingTime })
    if (!done.length) return 0
    return Math.round(done.reduce(function(s, j) { return s + j.processingTime }, 0) / done.length)
  })()

  var p95 = (function() {
    var times = jobs.filter(function(j) { return j.processingTime })
      .map(function(j) { return j.processingTime })
      .sort(function(a, b) { return a - b })
    if (!times.length) return 0
    return times[Math.floor(times.length * 0.95)] || times[times.length - 1]
  })()

  var peakHour = (function() {
    var hours = {}
    jobs.forEach(function(j) {
      var h = new Date(j.createdAt + 'Z').getHours()
      hours[h] = (hours[h] || 0) + 1
    })
    var vals = Object.values(hours)
    return vals.length ? Math.max.apply(null, vals) : 0
  })()

  // Init charts once on mount
  useEffect(function() {
    if (!throughputRef.current || !latencyRef.current || !queueRef.current) return

    throughputChart.current = new Chart(throughputRef.current, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [
          { label: 'Success', data: [], backgroundColor: '#22c55e', borderRadius: 4 },
          { label: 'Failure', data: [], backgroundColor: '#ef4444', borderRadius: 4 },
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#94a3b8' } },
          y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 }, color: '#94a3b8' }, beginAtZero: true }
        }
      }
    })

    latencyChart.current = new Chart(latencyRef.current, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Time (s)',
          data: [],
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139,92,246,0.08)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#94a3b8' } },
          y: {
            grid: { color: '#f1f5f9' },
            ticks: { font: { size: 10 }, color: '#94a3b8', callback: function(v) { return v + 's' } },
            beginAtZero: true
          }
        }
      }
    })

    queueChart.current = new Chart(queueRef.current, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Queue',
          data: [],
          borderColor: '#3b3fe4',
          backgroundColor: 'rgba(59,63,228,0.06)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#94a3b8' } },
          y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 }, color: '#94a3b8' }, beginAtZero: true }
        }
      }
    })

    chartsReady.current = true

    return function() {
      if (throughputChart.current) throughputChart.current.destroy()
      if (latencyChart.current)    latencyChart.current.destroy()
      if (queueChart.current)      queueChart.current.destroy()
    }
  }, [])

  // Update throughput + latency charts when range or data changes
  useEffect(function() {
    if (!chartsReady.current || !throughputChart.current || !latencyChart.current) return

    // Throughput buckets
    var bucketCount = range === '24h' ? 8 : range === '7d' ? 7 : 6
    var bucketMs    = rangeToMs(range) / bucketCount
    var now         = Date.now()
    var buckets     = []
    for (var i = 0; i < bucketCount; i++) {
      buckets.push(new Date(now - (bucketCount - 1 - i) * bucketMs))
    }

    var labels = buckets.map(function(b) {
      if (range === '7d' || range === '30d') {
        return b.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
      }
      return b.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    })

    var successData = buckets.map(function(b, i) {
      var nextTime = i + 1 < buckets.length ? buckets[i + 1].getTime() : now
      return allJobs.filter(function(j) {
        var t = new Date(j.updatedAt).getTime()
        return j.status === 'COMPLETED' && t >= b.getTime() && t < nextTime
      }).length
    })

    var failData = buckets.map(function(b, i) {
      var nextTime = i + 1 < buckets.length ? buckets[i + 1].getTime() : now
      return allJobs.filter(function(j) {
        var t = new Date(j.updatedAt).getTime()
        return j.status === 'FAILED' && t >= b.getTime() && t < nextTime
      }).length
    })

    throughputChart.current.data.labels           = labels
    throughputChart.current.data.datasets[0].data = successData
    throughputChart.current.data.datasets[1].data = failData
    throughputChart.current.update('none')

    // Latency chart — last 8 completed jobs in range
    var recentCompleted = jobs.filter(function(j) { return j.processingTime }).slice(-8)
    latencyChart.current.data.labels           = recentCompleted.map(function(j) { return 'JOB-' + String(j.id).padStart(4,'0') })
    latencyChart.current.data.datasets[0].data = recentCompleted.map(function(j) { return (j.processingTime / 1000).toFixed(2) })
    latencyChart.current.update('none')

  }, [range, allJobs])

  // Update queue chart on each metrics fetch
  useEffect(function() {
    if (!chartsReady.current || !queueChart.current || !metrics) return
    var ds = queueChart.current.data
    ds.labels.push(nowLabel())
    ds.datasets[0].data.push(metrics.queueSize || 0)
    if (ds.labels.length > 10) { ds.labels.shift(); ds.datasets[0].data.shift() }
    queueChart.current.update('none')
  }, [metrics])

  function exportData() {
    var data = {
      range: rangeLabel(range),
      exportedAt: new Date().toISOString(),
      jobsInRange: totalInRange,
      successRate: successRate + '%',
      errorRate: errorRate + '%',
      avgProcessingMs: avgProcessing,
      p95Ms: p95,
      completed: completed.length,
      failed: failed.length,
    }
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    var a    = document.createElement('a')
    a.href   = URL.createObjectURL(blob)
    a.download = 'metrics-' + range + '-' + Date.now() + '.json'
    a.click()
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">System Analytics</h1>
          <p className="page-subtitle">
            {rangeLabel(range)} · {totalInRange} jobs in window
          </p>
          {lastUpdate && <p className="text-xs text-slate-400 mt-0.5">Last updated: {lastUpdate}</p>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
            <span className="live-dot" /> LIVE
          </span>
          <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden">
            {['1h','6h','24h','7d','30d'].map(function(r) {
              return (
                <button
                  key={r}
                  onClick={function() { setRange(r) }}
                  className={
                    'px-3 py-1.5 text-xs font-semibold transition-colors ' +
                    (range === r ? 'bg-brand-500 text-white' : 'text-slate-500 hover:bg-slate-50')
                  }
                >{r}</button>
              )
            })}
          </div>
          <button onClick={fetchAll}    className="btn-secondary text-xs gap-1"><RefreshCw size={13} /> Refresh</button>
          <button onClick={exportData}  className="btn-secondary text-xs gap-1"><Download size={13} /> Export</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Jobs in Window',      value: totalInRange,        sub: rangeLabel(range),               icon: Layers,        color: 'text-brand-600',   bg: 'bg-brand-50'   },
          { label: 'Success Rate',         value: successRate + '%',  sub: completed.length + ' completed', icon: Activity,      color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Avg Processing',       value: avgProcessing+'ms', sub: 'Mean job duration',             icon: Clock,         color: 'text-violet-600',  bg: 'bg-violet-50'  },
          { label: 'Error Rate',           value: errorRate + '%',    sub: failed.length + ' failed',       icon: AlertTriangle, color: parseFloat(errorRate) > 10 ? 'text-red-500' : 'text-slate-600', bg: parseFloat(errorRate) > 10 ? 'bg-red-50' : 'bg-slate-100' },
        ].map(function(s) {
          var Icon = s.icon
          return (
            <div key={s.label} className="card p-4">
              <div className={'w-8 h-8 rounded-lg flex items-center justify-center mb-3 ' + s.bg}>
                <Icon className={s.color} size={15} />
              </div>
              <p className={'text-xl font-bold ' + s.color}>{s.value}</p>
              <p className="text-xs font-semibold text-slate-600 mt-0.5">{s.label}</p>
              <p className="text-xs text-slate-400">{s.sub}</p>
            </div>
          )
        })}
      </div>

      {/* P95 + Peak */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500">P95 Latency</p>
            <p className="text-xl font-bold text-violet-600">{p95 > 0 ? (p95/1000).toFixed(1)+'s' : '—'}</p>
            <p className="text-xs text-slate-400">95th percentile in {rangeLabel(range).toLowerCase()}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Activity className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Peak Hour</p>
            <p className="text-xl font-bold text-amber-600">{peakHour > 0 ? peakHour+' jobs' : '—'}</p>
            <p className="text-xs text-slate-400">Busiest hour in {rangeLabel(range).toLowerCase()}</p>
          </div>
        </div>
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 card p-5">
          <h2 className="section-title mb-1">Job Throughput</h2>
          <p className="text-xs text-slate-500 mb-4">Success vs failed — {rangeLabel(range)}</p>
          <div style={{ height: 200 }}><canvas ref={throughputRef} /></div>
          <div className="flex gap-5 mt-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-2 h-2 rounded-sm bg-green-500" />Success</div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-2 h-2 rounded-sm bg-red-400" />Failure</div>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="section-title mb-1">Time Distribution</h2>
          <p className="text-xs text-slate-500 mb-4">Duration buckets in {rangeLabel(range).toLowerCase()}.</p>
          {(function() {
            var done = jobs.filter(function(j) { return j.processingTime })
            if (!done.length) {
              return <p className="text-xs text-slate-400 text-center py-4">No completed jobs in this range</p>
            }
            return [
              { label: '< 1s',   min: 0,     max: 1000    },
              { label: '1–3s',   min: 1000,  max: 3000    },
              { label: '3–10s',  min: 3000,  max: 10000   },
              { label: '10–30s', min: 10000, max: 30000   },
              { label: '> 30s',  min: 30000, max: Infinity },
            ].map(function(b) {
              var count = done.filter(function(j) { return j.processingTime >= b.min && j.processingTime < b.max }).length
              var pct   = Math.round((count / done.length) * 100)
              return (
                <div key={b.label} className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 font-medium">{b.label}</span>
                    <span className="text-slate-500">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-400 rounded-full" style={{ width: pct + '%', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              )
            })
          })()}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-5">
          <h2 className="section-title mb-1">Processing Time per Job</h2>
          <p className="text-xs text-slate-500 mb-4">Last 8 completed jobs in {rangeLabel(range).toLowerCase()}.</p>
          <div style={{ height: 180 }}><canvas ref={latencyRef} /></div>
        </div>
        <div className="card p-5">
          <h2 className="section-title mb-1">Queue Size (Live)</h2>
          <p className="text-xs text-slate-500 mb-4">Pending jobs — updates every 10 seconds.</p>
          <div style={{ height: 180 }}><canvas ref={queueRef} /></div>
          <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-brand-500" />
            Current: {metrics?.queueSize || 0} pending
          </p>
        </div>
      </div>

      {/* Error breakdown */}
      <div className="card p-5">
        <h2 className="section-title mb-1">Error Breakdown by Job Type</h2>
        <p className="text-xs text-slate-500 mb-4">Failed jobs in {rangeLabel(range).toLowerCase()}.</p>
        {(function() {
          if (!failed.length) {
            return (
              <p className="text-xs text-slate-400 text-center py-4">
                No failed jobs in {rangeLabel(range).toLowerCase()} 🎉
              </p>
            )
          }
          var counts = {}
          failed.forEach(function(j) { counts[j.jobType] = (counts[j.jobType] || 0) + 1 })
          return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(counts).sort(function(a,b) { return b[1]-a[1] }).map(function(entry) {
                var type  = entry[0]
                var count = entry[1]
                var total = jobs.filter(function(j) { return j.jobType === type }).length
                var rate  = total ? Math.round((count/total)*100) : 0
                return (
                  <div key={type} className="p-3 bg-red-50 border border-red-100 rounded-xl">
                    <p className="text-xs font-bold text-slate-700 truncate">{type.replace(/_/g,' ')}</p>
                    <p className="text-lg font-bold text-red-500 mt-1">{count} <span className="text-xs text-red-400">failed</span></p>
                    <p className="text-xs text-slate-500">{rate}% failure rate</p>
                  </div>
                )
              })}
            </div>
          )
        })()}
      </div>
    </Layout>
  )
}