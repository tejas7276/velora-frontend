import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, RotateCcw, XCircle, Copy, Terminal,
  FileText, Cpu, Info, CheckCircle, AlertCircle,
  Download, ChevronDown, Clipboard, Code, Zap, Clock,
  Activity, Shield
} from 'lucide-react'
import Layout from '../components/Layout'
import StatusBadge from '../components/StatusBadge'
import { getJobById, retryJob, cancelJob } from '../api/jobs'
import { format } from 'date-fns'

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(dt) {
  try { return format(new Date(dt), 'MMM dd, yyyy - HH:mm') } catch { return '—' }
}
function getModelLabel(m) {
  if (!m) return 'Default'
  if (m.includes('8b'))  return 'Fast'
  if (m.includes('70b')) return 'Balanced'
  return 'Best Quality'
}
function cleanBold(t) {
  return t.replace(/\*\*(.*?)\*\*/g, '$1')
}

// ── Text Processing ──────────────────────────────────────────────────────────

var FILLERS = [
  'it is difficult','while it is','the question of','the history of',
  'in this','the following','below','as follows','i will','here is',
  'here are','this document','for each','provided','based on the',
  'note that','let me','this topic','the subject of','certainly',
  'of course','sure,','is a topic of','is a complex','is a fascinating',
  'is an interesting','the founder of cinema','a historical overview',
  'the founder of','a brief overview','an overview of',
  'introduction to','overview of','introduction:'
]

function stripPlain(text) {
  var s = text
    .replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1').replace(/^#{1,6}\s+/gm, '')
    .replace(/^\|.+\|$/gm, '').replace(/^[-*]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '').replace(/[=\-]{4,}/g, '')
    .replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim()

  // Detect & strip "Title mashup": "Introduction to C++ C++ is..."
  var words = s.split(/\s+/), seen = {}
  var TITLE_W = ['introduction','overview','history','about','the founder','background','a look at']
  for (var i = 1; i < Math.min(words.length, 20); i++) {
    var w = words[i].replace(/[^a-zA-Z0-9+#]/g, '')
    if (w.length < 2) continue
    if (seen[w]) {
      var idx    = s.indexOf(words[i], s.indexOf(words[i-1]) + words[i-1].length)
      var prefix = s.slice(0, idx).trim().toLowerCase()
      if (prefix.length < 65) {
        for (var t = 0; t < TITLE_W.length; t++) {
          if (prefix.startsWith(TITLE_W[t])) {
            var rest = s.slice(idx).trim()
            s = rest.charAt(0).toUpperCase() + rest.slice(1)
            break
          }
        }
      }
      break
    }
    seen[w] = true
  }
  return s
}

function pickSentences(plain, max) {
  var parts = plain.match(/[^.!?]{8,}[.!?]+/g) || []
  var result = '', count = 0
  for (var i = 0; i < parts.length; i++) {
    if (count >= max) break
    var s = parts[i].trim()
    if (s.length < 15) continue
    var low = s.toLowerCase(), bad = false
    for (var k = 0; k < FILLERS.length; k++) {
      if (low.startsWith(FILLERS[k]) || low.indexOf(FILLERS[k]) < 4) { bad = true; break }
    }
    if (bad) continue
    result += (result ? ' ' : '') + s
    count++
  }
  if (!result && parts.length > 0) {
    var fb = parts[0].trim()
      .replace(/^[^.!?]{0,80}:\s*[A-Z][^.!?]{0,80}(Overview|History|Introduction)[^.!?]*\s*/i, '')
    result = fb || plain.slice(0, 250)
  }
  return result
}

function detectResultType(text, jobType, payload) {
  if (!text) return 'empty'
  if (jobType === 'QUESTION_ANSWER') {
    if ((payload || '').trim().split(/\s+/).length <= 20) return 'compact'
  }
  var plain = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/^#+\s+.+$/gm, '').trim()
  if (plain.length < 300 || !text.includes('##')) return 'compact'
  return 'full'
}

function deriveConfidence(text) {
  if (!text) return null
  var m = text.match(/##\s*Confidence:\s*(High|Medium|Low)/i)
  if (m) return m[1]
  var lower = text.toLowerCase()
  var hedges = ['may ','might ','possibly ','uncertain','unclear','not sure',
                'approximately','around ','roughly','estimated','i cannot','not certain']
  var count = 0
  for (var i = 0; i < hedges.length; i++) { if (lower.includes(hedges[i])) count++ }
  if (count >= 2) return 'Low'
  if (count === 1) return 'Medium'
  if (text.includes('##') && text.length > 500) return 'High'
  if (text.length > 200) return 'Medium'
  return null
}

function buildSummary(text, jobType, payload) {
  if (!text || text.length < 5) return ''
  var plain = stripPlain(text)
  if (!plain || plain.length < 10) return ''

  // Job-type-aware summary: captures purpose + action + key details
  // Rules: NOT first sentence copy, NOT generic, answers "What was done and why?"

  var jt = (jobType || '').toUpperCase()
  var p  = (payload || '').trim()

  // For EMAIL_WRITER: extract subject + purpose from the email
  if (jt === 'EMAIL_WRITER') {
    // Try to extract Subject line
    var subMatch = text.match(/Subject:\s*(.+)/i)
    var sub = subMatch ? subMatch[1].trim() : ''
    // Try to extract key purpose from first body paragraph (skip greeting)
    var lines = text.split(/\n+/).map(function(l) { return l.trim() }).filter(Boolean)
    var bodyLine = ''
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i]
      if (l.startsWith('Subject:') || l.startsWith('Dear') || l.startsWith('Hi ') || l.startsWith('Hello')) continue
      if (l.length > 30) { bodyLine = l; break }
    }
    // ✅ FIXED (real summary, not copy)
  if (sub) {
    var purpose = ''

    if (bodyLine.toLowerCase().includes('leave')) {
      purpose = 'requesting leave'
    } else if (bodyLine.toLowerCase().includes('referral')) {
      purpose = 'requesting a referral'
    } else if (bodyLine.toLowerCase().includes('apply')) {
      purpose = 'applying for a role'
    }

    return 'A professional email is drafted ' + (purpose ? purpose + ' ' : '') + 'with clear context and intent.'
  }
    return bodyLine ? bodyLine.slice(0, 160) + (bodyLine.length > 160 ? '...' : '') : plain.slice(0, 160)
  }

  // For QUESTION_ANSWER: show what was asked + core answer
  if (jt === 'QUESTION_ANSWER') {
    if (p && p.length > 3) {
      var shortQ = p.length > 80 ? p.slice(0, 80) + '...' : p
      return 'Q: ' + shortQ + ' → ' + plain.slice(0, 120) + (plain.length > 120 ? '...' : '')
    }
    return plain.slice(0, 160)
  }

  // For RESUME_SCORE / AI_ANALYSIS: extract score or verdict line
  if (jt === 'RESUME_SCORE' || jt === 'JD_MATCH') {
    var scoreMatch = text.match(/(?:Overall Score|Match Score|Score)\s*[:\-]?\s*(\d+(?:\.\d+)?(?:\s*\/\s*100)?%?)/i)
    var verdictMatch = text.match(/(?:Verdict|Recommendation|Decision)\s*[:\-]?\s*([^]{5,60})/i)
    if (scoreMatch && verdictMatch) return scoreMatch[1].trim() + ' — ' + verdictMatch[1].trim()
    if (scoreMatch) return 'Score: ' + scoreMatch[1].trim() + ' — ' + plain.slice(0, 100)
  }

  // For SUMMARIZE: pick 2nd or 3rd sentence (not first — first is always copied)
  if (jt === 'SUMMARIZE') {
    var parts = plain.match(/[^.!?]{15,}[.!?]+/g) || []
    // Skip first sentence, use second or third
    for (var k = 1; k < Math.min(parts.length, 4); k++) {
      var s = parts[k].trim()
      var low = s.toLowerCase()
      var bad = false
      for (var f = 0; f < FILLERS.length; f++) {
        if (low.startsWith(FILLERS[f])) { bad = true; break }
      }
      if (!bad && s.length > 20) return s
    }
  }

  // Default: use second meaningful sentence from plain text (not first — avoids copying)
  var sentences = plain.match(/[^.!?]{15,}[.!?]+/g) || []
  for (var si = 1; si < Math.min(sentences.length, 5); si++) {
    var sent = sentences[si].trim()
    var sentLow = sent.toLowerCase()
    var isFiller = false
    for (var fi = 0; fi < FILLERS.length; fi++) {
      if (sentLow.startsWith(FILLERS[fi])) { isFiller = true; break }
    }
    if (!isFiller && sent.length > 20) return sent
  }

  // Absolute fallback: tail of plain text (never the start — avoids copying first sentence)
  if (plain.length > 80) {
    var mid = Math.floor(plain.length * 0.35)
    return plain.slice(mid, mid + 160).trim() + (plain.length - mid > 160 ? '...' : '')
  }
  return ''
}

// ── Three.js Particle Canvas ─────────────────────────────────────────────────

function ParticleField({ status }) {
  var ref = useRef(null)
  useEffect(function() {
    var canvas = ref.current
    if (!canvas) return
    var ctx = canvas.getContext('2d')
    var W = canvas.width  = canvas.offsetWidth
    var H = canvas.height = canvas.offsetHeight
    var isActive = status === 'COMPLETED' || status === 'PROCESSING'
    var color = status === 'COMPLETED' ? '59,130,246'
              : status === 'FAILED'    ? '239,68,68'
              : status === 'PROCESSING'? '99,102,241'
              : '148,163,184'
    var count = 28
    var dots = []
    for (var i = 0; i < count; i++) {
      dots.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * (isActive ? 0.4 : 0.15),
        vy: (Math.random() - 0.5) * (isActive ? 0.4 : 0.15),
        r: Math.random() * 2 + 1,
        pulse: Math.random() * Math.PI * 2
      })
    }
    var raf
    function draw() {
      ctx.clearRect(0, 0, W, H)
      dots.forEach(function(d) {
        d.x += d.vx; d.y += d.vy; d.pulse += 0.02
        if (d.x < 0 || d.x > W) d.vx *= -1
        if (d.y < 0 || d.y > H) d.vy *= -1
      })
      for (var a = 0; a < dots.length; a++) {
        for (var b = a + 1; b < dots.length; b++) {
          var dx = dots[a].x - dots[b].x, dy = dots[a].y - dots[b].y
          var dist = Math.sqrt(dx*dx + dy*dy)
          if (dist < 80) {
            ctx.beginPath()
            ctx.strokeStyle = 'rgba(' + color + ',' + (1 - dist/80) * 0.25 + ')'
            ctx.lineWidth = 0.8
            ctx.moveTo(dots[a].x, dots[a].y)
            ctx.lineTo(dots[b].x, dots[b].y)
            ctx.stroke()
          }
        }
      }
      dots.forEach(function(d) {
        var glow = (Math.sin(d.pulse) + 1) / 2
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.r + glow * 0.8, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(' + color + ',' + (0.3 + glow * 0.4) + ')'
        ctx.fill()
      })
      raf = requestAnimationFrame(draw)
    }
    draw()
    return function() { cancelAnimationFrame(raf) }
  }, [status])
  return <canvas ref={ref} className="absolute inset-0 w-full h-full" />
}

// ── Markdown Renderer ────────────────────────────────────────────────────────

function ResultRenderer({ text }) {
  var lines = text.split('\n'), els = [], i = 0
  while (i < lines.length) {
    var t = lines[i].trim()
    if (!t) { els.push(<div key={i} className="h-3" />); i++; continue }
    if (t.startsWith('# '))   { els.push(<h1 key={i} className="text-lg font-bold text-slate-900 mt-5 mb-2 pb-2 border-b-2 border-brand-100">{cleanBold(t.slice(2))}</h1>); i++; continue }
    if (t.startsWith('## '))  { els.push(<h2 key={i} className="text-sm font-bold text-slate-700 mt-4 mb-2 pb-1 border-b border-slate-100 uppercase tracking-wider">{cleanBold(t.slice(3))}</h2>); i++; continue }
    if (t.startsWith('### ')) { els.push(<h3 key={i} className="text-xs font-bold text-brand-500 mt-3 mb-1 uppercase tracking-widest">{cleanBold(t.slice(4))}</h3>); i++; continue }
    if (/^\d+\.\s/.test(t)) {
      var num = t.match(/^(\d+)\.\s/)[1], body = t.replace(/^\d+\.\s/,'')
      els.push(<div key={i} className="flex items-start gap-3 my-2 ml-1"><span className="flex-shrink-0 w-5 h-5 bg-brand-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center mt-0.5">{num}</span><span className="text-sm text-slate-700 leading-relaxed flex-1">{cleanBold(body)}</span></div>)
      i++; continue
    }
    if (t.startsWith('- ') || t.startsWith('* ')) {
      els.push(<div key={i} className="flex items-start gap-2.5 my-1.5 ml-1"><span className="flex-shrink-0 w-1.5 h-1.5 bg-brand-400 rounded-full mt-2" /><span className="text-sm text-slate-700 leading-relaxed flex-1">{cleanBold(t.replace(/^[-*]\s/,''))}</span></div>)
      i++; continue
    }
    if (t.startsWith('| ') && t.endsWith(' |')) {
      if (t.includes('---')) { i++; continue }
      var cells = t.split('|').map(function(c){ return c.trim() }).filter(Boolean)
      els.push(<div key={i} className="flex gap-2 text-xs py-1.5 border-b border-slate-100">{cells.map(function(c,ci){ return <span key={ci} className="flex-1 text-slate-600">{cleanBold(c)}</span> })}</div>)
      i++; continue
    }
    if (/^[=\-]{4,}$/.test(t)) { i++; continue }
    els.push(<p key={i} className="text-sm text-slate-700 leading-relaxed my-1.5">{cleanBold(t)}</p>)
    i++
  }
  return <div className="flex flex-col">{els}</div>
}

// ── Compact Answer (short Q&A) ───────────────────────────────────────────────

function CompactResult({ text }) {
  var plain  = stripPlain(text)
  var result = pickSentences(plain, 2)
  return (
    <p className="text-[15px] text-slate-800 leading-relaxed font-normal">
      {result || plain.slice(0, 300)}
    </p>
  )
}

// ── Animated Counter ─────────────────────────────────────────────────────────

function AnimCounter({ value, suffix }) {
  var [display, setDisplay] = useState(0)
  useEffect(function() {
    var start = 0, end = parseFloat(value) || 0, dur = 800
    var step = end / (dur / 16)
    var iv = setInterval(function() {
      start += step
      if (start >= end) { setDisplay(end); clearInterval(iv) }
      else setDisplay(parseFloat(start.toFixed(2)))
    }, 16)
    return function() { clearInterval(iv) }
  }, [value])
  return <span>{display}{suffix}</span>
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function JobDetails() {
  var { id }   = useParams()
  var navigate = useNavigate()

  var [job,          setJob]          = useState(null)
  var [loading,      setLoading]      = useState(true)
  var [copied,       setCopied]       = useState(false)
  var [copyMode,     setCopyMode]     = useState(null)
  var [actionMsg,    setActionMsg]    = useState('')
  var [actionErr,    setActionErr]    = useState('')
  var [showCopyMenu, setShowCopyMenu] = useState(false)
  var [mounted,      setMounted]      = useState(false)

  var fetchJob = useCallback(function() {
    getJobById(id)
      .then(function(r) { setJob(r.data) })
      .catch(function()  { setJob(null) })
      .finally(function() { setLoading(false) })
  }, [id])

  useEffect(function() { fetchJob() }, [fetchJob])
  useEffect(function() { var t = setTimeout(function() { setMounted(true) }, 60); return function() { clearTimeout(t) } }, [])

  useEffect(function() {
    if (!job || (job.status !== 'PROCESSING' && job.status !== 'PENDING')) return
    var iv = setInterval(function() {
      getJobById(id).then(function(r) { setJob(r.data) }).catch(function() {})
    }, 3000)
    return function() { clearInterval(iv) }
  }, [id, job ? job.status : null])

  function handleRetry() {
    setActionErr('')
    retryJob(id)
      .then(function() { setActionMsg('Job re-queued!'); setTimeout(function() { setActionMsg(''); fetchJob() }, 1500) })
      .catch(function(e) { setActionErr(e.response?.data?.message || 'Cannot retry this job') })
  }

  function handleCancel() {
    setActionErr('')
    cancelJob(id)
      .then(function() { setActionMsg('Job cancelled.'); setTimeout(function() { setActionMsg(''); fetchJob() }, 1500) })
      .catch(function(e) { setActionErr(e.response?.data?.message || 'Cannot cancel this job') })
  }

  function copyAs(mode) {
    if (!job || !job.result) return
    var text = mode === 'text'
      ? job.result.replace(/\*\*(.*?)\*\*/g,'$1').replace(/^#+\s+/gm,'').replace(/^[-*]\s+/gm,'').replace(/^\d+\.\s+/gm,'').replace(/\n{3,}/g,'\n\n').trim()
      : job.result
    navigator.clipboard.writeText(text)
    setCopied(true); setCopyMode(mode); setShowCopyMenu(false)
    setTimeout(function() { setCopied(false); setCopyMode(null) }, 2000)
  }

  function downloadBundle() {
    if (!job) return
    var blob = new Blob([JSON.stringify({
      jobId: job.id, jobType: job.jobType, aiModel: job.aiModel || 'default',
      status: job.status, result: job.result, errorMessage: job.errorMessage,
      processingTime: job.processingTime, priority: job.priority,
      scheduledAt: job.scheduledAt, createdAt: job.createdAt, updatedAt: job.updatedAt,
    }, null, 2)], { type: 'application/json' })
    var a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'job-' + job.id + '-result.json'
    a.click()
  }

  var fileName   = job && job.filePath ? job.filePath.split(/[/\\]/).pop() : null
  var canRetry   = job && (job.status === 'FAILED' || job.status === 'CANCELLED')
  var canCancel  = job && (job.status === 'PENDING' || job.status === 'PROCESSING' || job.status === 'SCHEDULED')
  var resultType = job && job.result ? detectResultType(job.result, job.jobType, job.payload) : 'empty'
  var confidence = job && job.result ? deriveConfidence(job.result) : null
  var summary    = job && job.result ? buildSummary(job.result, job.jobType, job.payload) : ''
  var compactAnswer = job && job.result ? pickSentences(stripPlain(job.result), 1) : ''

  var confStyle = {
    High:   { bg: 'bg-emerald-500', text: 'text-white', label: '✦ High Confidence' },
    Medium: { bg: 'bg-amber-400',   text: 'text-white', label: '◈ Medium Confidence' },
    Low:    { bg: 'bg-red-500',     text: 'text-white', label: '◉ Low Confidence' },
  }

  var statusGlow = {
    COMPLETED:  '0 0 30px rgba(59,130,246,0.15)',
    PROCESSING: '0 0 30px rgba(99,102,241,0.2)',
    FAILED:     '0 0 30px rgba(239,68,68,0.15)',
    PENDING:    'none',
  }

  var logs = job ? [
    { time: fmt(job.createdAt), level: 'INFO',  msg: 'Job queued. Type: ' + job.jobType + ' · Priority: ' + (job.priority||'MEDIUM') },
    { time: fmt(job.createdAt), level: 'INFO',  msg: 'Model: ' + getModelLabel(job.aiModel) + ' (' + (job.aiModel||'default') + ')' },
    job.workerId ? { time: fmt(job.updatedAt), level: 'INFO',  msg: 'Assigned to Node-' + job.workerId + '. Processing started.' } : null,
    job.retryCount > 0 ? { time: fmt(job.updatedAt), level: 'WARN',  msg: 'Retry attempt #' + job.retryCount + ' of 3' } : null,
    job.status === 'COMPLETED' && job.processingTime
      ? { time: fmt(job.updatedAt), level: 'INFO',
          msg: 'Done in ' + (job.processingTime/1000).toFixed(2) + 's · ~' +
               Math.round(((job.result||'').split(' ').length)*1.3) + ' tokens' } : null,
    job.status === 'FAILED' ? { time: fmt(job.updatedAt), level: 'ERROR', msg: (job.errorMessage||'Unknown error').slice(0,100) } : null,
  ].filter(Boolean) : []

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center py-40">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div className="spinner w-10 h-10" />
          <p className="text-xs text-slate-400 tracking-widest uppercase">Loading Job</p>
        </div>
      </div>
    </Layout>
  )

  if (!job) return (
    <Layout>
      <div className="max-w-md mx-auto text-center py-20">
        <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-6 h-6 text-red-400" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 mb-2">Job not found</h2>
        <p className="text-sm text-slate-500 mb-5">No execution data for job #{id}.</p>
        <Link to="/jobs" className="btn-primary">← Back to Jobs</Link>
      </div>
    </Layout>
  )

  return (
    <Layout>
      {/* ── Global styles for this page ── */}
      <style>{`
        @keyframes fadeUp   { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:none } }
        @keyframes fadeLeft { from { opacity:0; transform:translateX(-12px)} to { opacity:1; transform:none } }
        @keyframes fadeRight{ from { opacity:0; transform:translateX(12px) } to { opacity:1; transform:none } }
        @keyframes pulse2   { 0%,100%{ opacity:.5 } 50%{ opacity:1 } }
        @keyframes shimmer  { 0%{ background-position:-200% center } 100%{ background-position:200% center } }
        .fade-up   { animation: fadeUp   0.5s cubic-bezier(.16,1,.3,1) both }
        .fade-left { animation: fadeLeft 0.5s cubic-bezier(.16,1,.3,1) both }
        .fade-right{ animation: fadeRight 0.5s cubic-bezier(.16,1,.3,1) both }
        .stagger-1 { animation-delay:.05s }
        .stagger-2 { animation-delay:.10s }
        .stagger-3 { animation-delay:.15s }
        .stagger-4 { animation-delay:.20s }
        .stagger-5 { animation-delay:.25s }
        .shimmer-text {
          background: linear-gradient(90deg,#3b3fe4,#6366f1,#8b5cf6,#3b3fe4);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s linear infinite;
        }
        .result-card::-webkit-scrollbar { width: 4px }
        .result-card::-webkit-scrollbar-track { background: transparent }
        .result-card::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px }
      `}</style>

      {/* Back link */}
      <Link to="/jobs" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 mb-5 transition-colors fade-up">
        <ArrowLeft size={13} /> Back to Jobs Monitoring
      </Link>

      {/* ── Hero Header ── */}
      <div
        className="relative rounded-2xl overflow-hidden mb-6 fade-up stagger-1"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
          boxShadow: statusGlow[job.status] || 'none',
          minHeight: 140,
        }}
      >
        <ParticleField status={job.status} />
        <div className="relative z-10 px-6 py-5 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <span className="text-white/40 text-xs font-mono tracking-widest uppercase">Job</span>
              <h1 className="text-2xl font-black text-white tracking-tight" style={{ letterSpacing: '-0.02em' }}>
                #{String(job.id).padStart(4,'0')}
              </h1>
              <StatusBadge status={job.status} />
              {confidence && (
                <span className={'text-[10px] px-2.5 py-1 rounded-full font-bold ' + confStyle[confidence].bg + ' ' + confStyle[confidence].text}>
                  {confStyle[confidence].label}
                </span>
              )}
              {(job.status === 'PROCESSING' || job.status === 'PENDING') && (
                <span className="flex items-center gap-1.5 text-xs text-blue-300 font-medium">
                  <span className="live-dot" /> Live
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-white/50 font-mono bg-white/5 px-2.5 py-1 rounded-lg">
                {job.jobType.replace(/_/g,' ')}
              </span>
              {job.aiModel && (
                <span className="text-xs text-violet-300 bg-violet-500/15 border border-violet-500/20 px-2.5 py-1 rounded-lg font-medium">
                  ◈ {getModelLabel(job.aiModel)}
                </span>
              )}
              {job.processingTime && (
                <span className="text-xs text-emerald-300 bg-emerald-500/15 border border-emerald-500/20 px-2.5 py-1 rounded-lg font-medium">
                  ⚡ <AnimCounter value={(job.processingTime/1000).toFixed(2)} suffix="s" />
                </span>
              )}
              {job.priority && job.priority !== 'MEDIUM' && (
                <span className="text-xs text-amber-300 bg-amber-500/15 border border-amber-500/20 px-2.5 py-1 rounded-lg font-medium">
                  ↑ {job.priority}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-shrink-0">
            {canRetry  && (
              <button onClick={handleRetry}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all">
                <RotateCcw size={12} /> Retry
              </button>
            )}
            {canCancel && (
              <button onClick={handleCancel}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-300 bg-red-500/15 hover:bg-red-500/25 border border-red-500/25 transition-all">
                <XCircle size={12} /> Cancel
              </button>
            )}
            <button onClick={downloadBundle}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white/70 bg-white/8 hover:bg-white/15 border border-white/15 transition-all">
              <Download size={12} /> Download
            </button>
          </div>
        </div>
      </div>

      {/* Action banners */}
      {actionMsg && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-xl mb-4 text-sm text-green-700 fade-up">
          <CheckCircle size={14} /> {actionMsg}
        </div>
      )}
      {actionErr && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl mb-4 text-sm text-red-600 fade-up">
          <AlertCircle size={14} /> {actionErr}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* ── LEFT COLUMN ──────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3 fade-left stagger-2">
            {[
              { icon: Clock,    label: 'Duration',    value: job.processingTime ? (job.processingTime/1000).toFixed(2)+'s' : '—', color: 'text-brand-600', bg: 'bg-brand-50' },
              { icon: Activity, label: 'Retries',     value: (job.retryCount||0)+'/3',    color: 'text-violet-600', bg: 'bg-violet-50' },
              { icon: Shield,   label: 'Priority',    value: job.priority||'MEDIUM',      color: 'text-amber-600',  bg: 'bg-amber-50'  },
              { icon: Zap,      label: 'Scheduled',   value: job.scheduledAt ? 'Yes' : 'Now', color: 'text-emerald-600', bg: 'bg-emerald-50' },
            ].map(function(s) {
              var Icon = s.icon
              return (
                <div key={s.label} className="card p-3.5 flex items-center gap-3">
                  <div className={'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ' + s.bg}>
                    <Icon size={14} className={s.color} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">{s.label}</p>
                    <p className={'text-sm font-bold ' + s.color}>{s.value}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Job Metadata */}
          <div className="card p-5 fade-left stagger-3">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-brand-50 rounded-lg flex items-center justify-center">
                <Cpu size={12} className="text-brand-500" />
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Job Metadata</p>
            </div>
            {[
              { label: 'Job Type',   value: job.jobType.replace(/_/g,' ') },
              { label: 'Created By', value: 'User #' + job.userId },
              { label: 'Started',    value: fmt(job.createdAt) },
              { label: 'Updated',    value: fmt(job.updatedAt) },
              { label: 'AI Model',   value: getModelLabel(job.aiModel) + ' · ' + (job.aiModel||'default') },
              { label: 'Scheduled',  value: job.scheduledAt ? fmt(job.scheduledAt) : 'Immediate' },
              fileName ? { label: 'File', value: fileName } : null,
            ].filter(Boolean).map(function(item) {
              return (
                <div key={item.label} className="flex justify-between items-start py-2.5 border-b border-slate-50 last:border-0 gap-3">
                  <span className="text-xs text-slate-400 flex-shrink-0">{item.label}</span>
                  <span className="text-xs font-semibold text-slate-700 text-right truncate max-w-[180px]">{item.value}</span>
                </div>
              )
            })}
          </div>

          {/* Execution Logs */}
          <div className="card overflow-hidden fade-left stagger-4">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
              <Terminal size={13} className="text-slate-400" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Execution Logs</span>
            </div>
            <div className="log-terminal rounded-none rounded-b-xl min-h-[90px] max-h-[150px] text-[11px]">
              {logs.map(function(l, idx) {
                return (
                  <div key={idx} className="flex gap-2 mb-1.5">
                    <span className="text-slate-600 flex-shrink-0">[{l.time}]</span>
                    <span className={'font-bold flex-shrink-0 ' + (l.level==='ERROR'?'text-red-400':l.level==='WARN'?'text-amber-400':'text-blue-400')}>{l.level}</span>
                    <span className={'flex-1 ' + (l.level==='ERROR'?'text-red-300':l.level==='WARN'?'text-amber-300':'text-slate-400')}>{l.msg}</span>
                  </div>
                )
              })}
              <span className="text-slate-600 animate-pulse">_</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-3 flex flex-col gap-4">

          {/* AI Result card */}
          {job.result && (
            <div className="card overflow-hidden fade-right stagger-2">

              {/* User Input block — shows original request for context */}
              {job.payload && job.payload.trim().length > 0 && (
              <div className="px-5 py-4 border-b border-slate-100 max-h-[320px] overflow-y-auto">
                <p className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-widest">
                  Query
                </p>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
                  {job.payload}
                </p>
              </div>
            )}

              {/* Card header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-brand-500 to-violet-500 rounded-lg flex items-center justify-center">
                    <FileText size={12} className="text-white" />
                  </div>
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">AI Result</span>
                </div>
                {/* Copy dropdown */}
                <div className="relative">
                  <button
                    onClick={function() { setShowCopyMenu(function(v){ return !v }) }}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition-all"
                  >
                    {copied
                      ? <><CheckCircle size={12} className="text-emerald-500" /> Copied!</>
                      : <><Copy size={12} /> Copy <ChevronDown size={10} /></>}
                  </button>
                  {showCopyMenu && !copied && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden w-44">
                      <button onClick={function(){ copyAs('text') }} className="flex items-center gap-2 px-3 py-2.5 text-xs text-slate-600 hover:bg-slate-50 w-full">
                        <Clipboard size={12} /> Plain text
                      </button>
                      <button onClick={function(){ copyAs('markdown') }} className="flex items-center gap-2 px-3 py-2.5 text-xs text-slate-600 hover:bg-slate-50 w-full">
                        <Code size={12} /> Markdown
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Result body */}
              {job.jobType === 'EMAIL_WRITER' ? (
                <div className="px-5 py-4 max-h-[480px] overflow-y-auto result-card whitespace-pre-line">
                  <ResultRenderer text={job.result} />
                </div>
              ) : resultType === 'compact' ? (
                <div className="px-5 py-5">
                  <CompactResult text={job.result} />
                </div>
              ) : (
                <div className="px-5 py-4 max-h-[480px] overflow-y-auto result-card">
                  <ResultRenderer text={job.result} />
                </div>
              )}

              {/* One-liner summary — only for FULL results (not compact, avoids duplication) */}
              {summary && summary.length > 0 && (
                <div className="mx-4 mb-4 mt-1 rounded-xl overflow-hidden" style={{ background: 'linear-gradient(135deg,#eff6ff,#f5f3ff)' }}>
                  <div className="px-4 py-3 border border-brand-100 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-4 h-4 bg-gradient-to-br from-brand-500 to-violet-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-[8px] font-black">AI</span>
                      </div>
                      <span className="text-[10px] font-bold text-brand-600 uppercase tracking-widest">One-liner Summary</span>
                      {confidence && (
                        <span className={'text-[9px] px-2 py-0.5 rounded-full font-bold ml-auto ' + confStyle[confidence].bg + ' ' + confStyle[confidence].text}>
                          {confidence}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed flex-1 whitespace-pre-wrap flex-1">{summary}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Processing / waiting state */}
          {!job.result && job.status !== 'FAILED' && (
            <div className="card p-12 flex flex-col items-center justify-center text-center fade-right stagger-2">
              {(job.status === 'PROCESSING' || job.status === 'PENDING') ? (
                <div className="relative">
                  <div className="spinner w-10 h-10 mb-5" />
                  <p className="text-sm font-semibold text-slate-700">Processing your request...</p>
                  <p className="text-xs text-slate-400 mt-1.5">Auto-refreshes every 3 seconds</p>
                </div>
              ) : (
                <>
                  <FileText className="w-10 h-10 text-slate-200 mb-3" />
                  <p className="text-sm text-slate-400">No result available yet</p>
                </>
              )}
            </div>
          )}

          {/* Error display */}
          {job.status === 'FAILED' && job.errorMessage && (function() {
            var msg = job.errorMessage || ''
            var low = msg.toLowerCase()
            var isTimeout = low.includes('timeout') || low.includes('timed out')
            var isAPI     = low.includes('groq')    || low.includes('api error')
            var isValid   = low.includes('invalid') || low.includes('bad request')
            var type  = isTimeout ? 'Timeout' : isAPI ? 'AI API Error' : isValid ? 'Validation Error' : 'Processing Error'
            var color = isTimeout ? 'text-amber-600' : isAPI ? 'text-violet-600' : 'text-red-500'
            var bg    = isTimeout ? 'bg-amber-50 border-amber-200' : isAPI ? 'bg-violet-50 border-violet-200' : 'bg-red-50 border-red-200'
            var tip   = isTimeout ? 'Try the Fast model for quicker responses.' : isAPI ? 'Groq API issue — usually temporary.' : isValid ? 'Check your input and retry.' : 'An error occurred during processing.'
            return (
              <div className={'card p-5 border ' + bg + ' fade-right stagger-2'}>
                <div className="flex items-center gap-2 mb-2">
                  <XCircle size={14} className={color} />
                  <p className={'text-sm font-bold ' + color}>{type}</p>
                </div>
                <p className="text-xs text-slate-500 mb-3">{tip}</p>
                <div className="bg-white border border-slate-100 rounded-xl p-3 text-xs font-mono text-slate-600 whitespace-pre-wrap leading-relaxed mb-4">
                  {msg}
                </div>
                <button onClick={handleRetry} className="btn-primary gap-2 text-sm">
                  <RotateCcw size={13} /> Retry This Job
                </button>
              </div>
            )
          })()}

          {/* Bottom cards */}
          <div className="grid grid-cols-2 gap-3 fade-right stagger-4">
            <button onClick={function() { navigate('/workers') }}
              className="card p-4 flex flex-col items-center text-center gap-2 hover:border-brand-200 hover:shadow-md transition-all cursor-pointer group">
              <div className="w-8 h-8 bg-slate-50 group-hover:bg-brand-50 rounded-xl flex items-center justify-center transition-colors">
                <Terminal className="w-4 h-4 text-slate-400 group-hover:text-brand-500 transition-colors" />
              </div>
              <p className="text-xs font-semibold text-slate-700">Processing Engine</p>
              <p className="text-[11px] text-slate-400">View engine status</p>
            </button>
            <button onClick={downloadBundle}
              className="card p-4 flex flex-col items-center text-center gap-2 hover:border-brand-200 hover:shadow-md transition-all cursor-pointer group">
              <div className="w-8 h-8 bg-slate-50 group-hover:bg-brand-50 rounded-xl flex items-center justify-center transition-colors">
                <Download className="w-4 h-4 text-slate-400 group-hover:text-brand-500 transition-colors" />
              </div>
              <p className="text-xs font-semibold text-slate-700">Download Bundle</p>
              <p className="text-[11px] text-slate-400">Export as JSON</p>
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}