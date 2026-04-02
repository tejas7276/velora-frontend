import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Zap, AlertCircle, ArrowRight, Activity, Cpu, Shield, Eye, EyeOff } from 'lucide-react'
import { login } from '../api/auth'
import { useAuth } from '../context/AuthContext'

function NeuralCanvas() {
  var canvasRef = useRef(null)
  useEffect(function() {
    var canvas = canvasRef.current
    if (!canvas) return
    var ctx   = canvas.getContext('2d')
    var W     = canvas.width  = canvas.offsetWidth
    var H     = canvas.height = canvas.offsetHeight
    var nodes = []
    var COUNT = 60, CONNECT = 120
    for (var i = 0; i < COUNT; i++) {
      nodes.push({ x: Math.random()*W, y: Math.random()*H, vx: (Math.random()-0.5)*0.4, vy: (Math.random()-0.5)*0.4, r: Math.random()*2+1, pulse: Math.random()*Math.PI*2 })
    }
    var raf
    function draw() {
      ctx.clearRect(0,0,W,H)
      nodes.forEach(function(n) { n.x+=n.vx; n.y+=n.vy; n.pulse+=0.02; if(n.x<0||n.x>W)n.vx*=-1; if(n.y<0||n.y>H)n.vy*=-1 })
      for (var a=0;a<nodes.length;a++) for (var b=a+1;b<nodes.length;b++) {
        var dx=nodes[a].x-nodes[b].x, dy=nodes[a].y-nodes[b].y, dist=Math.sqrt(dx*dx+dy*dy)
        if (dist<CONNECT) { ctx.beginPath(); ctx.strokeStyle='rgba(99,102,241,'+(1-dist/CONNECT)*0.25+')'; ctx.lineWidth=0.5; ctx.moveTo(nodes[a].x,nodes[a].y); ctx.lineTo(nodes[b].x,nodes[b].y); ctx.stroke() }
      }
      nodes.forEach(function(n) { var glow=(Math.sin(n.pulse)+1)/2; ctx.beginPath(); ctx.arc(n.x,n.y,n.r+glow,0,Math.PI*2); ctx.fillStyle='rgba(129,140,248,'+(0.4+glow*0.4)+')'; ctx.fill() })
      raf = requestAnimationFrame(draw)
    }
    draw()
    return function() { cancelAnimationFrame(raf) }
  }, [])
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
}

function Counter({ to, suffix }) {
  var [val, setVal] = useState(0)
  useEffect(function() {
    var start=0, step=to/40
    var t = setInterval(function() { start+=step; if(start>=to){setVal(to);clearInterval(t)}else setVal(Math.floor(start)) }, 30)
    return function() { clearInterval(t) }
  }, [to])
  return <span>{val.toLocaleString()}{suffix}</span>
}

export default function Login() {
  var [form,    setForm]    = useState({ email: '', password: '' })
  var [error,   setError]   = useState('')
  var [loading, setLoading] = useState(false)
  var [focused, setFocused] = useState('')
  var [mounted, setMounted] = useState(false)
  var [showPwd, setShowPwd] = useState(false)
  var [shake,   setShake]   = useState(0)   // incremented on each error to retrigger animation
  var { saveAuth } = useAuth()
  var navigate     = useNavigate()

  useEffect(function() {
    var t = setTimeout(function() { setMounted(true) }, 50)
    return function() { clearTimeout(t) }
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    login(form)
      .then(function(res) { saveAuth(res.data); navigate('/dashboard') })
      .catch(function(err) {
        setError(err.response?.data?.message || 'Invalid email or password')
        // Increment shake key so animation retriggers even on repeated errors
        setShake(function(n) { return n + 1 })
      })
      .finally(function() { setLoading(false) })
  }

  var stats = [
    { icon: Activity, label: 'Jobs Processed', value: 128400, suffix: '+' },
    { icon: Cpu,      label: 'Avg Latency',    value: 1943,   suffix: 'ms' },
    { icon: Shield,   label: 'Uptime',         value: 99,     suffix: '.9%' },
  ]

  // Stagger delays for form elements
  var delays = { logo: '0.20s', heading: '0.25s', email: '0.32s', password: '0.38s', btn: '0.44s', divider: '0.50s', register: '0.54s', footer: '0.58s' }

  return (
    <div className="min-h-screen flex overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #1a1548 50%, #0f0c29 100%)' }}>

      {/* ── Left panel ── */}
      <div className="hidden lg:flex w-[55%] flex-col relative overflow-hidden"
        style={{ transition: 'opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)', opacity: mounted?1:0, transform: mounted?'translateX(0)':'translateX(-40px)' }}>
        <div className="absolute inset-0">
          <NeuralCanvas />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.08) 100%)' }} />
        </div>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative z-10 flex flex-col h-full p-12">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-auto" style={{ animation: mounted ? 'fadeDown 0.55s cubic-bezier(0.16,1,0.3,1) 0.15s both' : 'none' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 20px rgba(99,102,241,0.4)' }}>
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-white text-lg tracking-tight">Velora</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-emerald-400 font-medium tracking-wider">SYSTEM ONLINE</span>
              </div>
            </div>
          </div>

          {/* Hero text */}
          <div className="my-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 mb-6"
              style={{ animation: mounted ? 'fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.28s both' : 'none' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-xs text-indigo-300 font-medium tracking-wider">DISTRIBUTED AI PROCESSING</span>
            </div>
            <h1 className="text-5xl font-black text-white leading-tight mb-4"
              style={{ fontFamily: 'system-ui', letterSpacing: '-0.03em', animation: mounted ? 'fadeUp 0.55s cubic-bezier(0.16,1,0.3,1) 0.35s both' : 'none' }}>
              Scale AI<br />
              <span style={{ background: 'linear-gradient(90deg, #818cf8, #c084fc, #818cf8)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'shimmer 3s linear infinite' }}>Without Limits.</span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed max-w-sm"
              style={{ animation: mounted ? 'fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.42s both' : 'none' }}>
              Queue, process, and monitor AI workloads across your infrastructure in real-time.
            </p>
          </div>

          {/* Stat cards — staggered + hover lift */}
          <div className="grid grid-cols-3 gap-4">
            {stats.map(function(s, idx) {
              var Icon = s.icon
              return (
                <div key={s.label}
                  className="rounded-xl p-4 border border-white/10 stat-card"
                  style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', animation: mounted ? 'fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) ' + (0.48 + idx * 0.07) + 's both' : 'none' }}>
                  <Icon className="w-4 h-4 text-indigo-400 mb-2" />
                  <p className="text-xl font-bold text-white"><Counter to={s.value} suffix={s.suffix} /></p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex items-center justify-center p-8"
        style={{ transition: 'opacity 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s, transform 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s', opacity: mounted?1:0, transform: mounted?'translateX(0)':'translateX(40px)' }}>
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2.5 mb-8"
            style={{ animation: mounted ? 'fadeDown 0.5s cubic-bezier(0.16,1,0.3,1) ' + delays.logo + ' both' : 'none' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-base">Velora</span>
          </div>

          {/* Heading */}
          <div className="mb-8" style={{ animation: mounted ? 'fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) ' + delays.heading + ' both' : 'none' }}>
            <h2 className="text-3xl font-black text-white mb-2" style={{ letterSpacing: '-0.02em' }}>Welcome back</h2>
            <p className="text-slate-400">Sign in to your processing dashboard</p>
          </div>

          {/* Error — shake retriggers via key prop */}
          {error && (
            <div key={shake}
              className="flex items-center gap-2 p-3 rounded-xl border border-red-500/30 bg-red-500/10 mb-5 text-sm text-red-400"
              style={{ animation: 'slideDown 0.28s cubic-bezier(0.16,1,0.3,1) both, shake 0.45s cubic-bezier(0.36,0.07,0.19,0.97) 0.28s both' }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" autoComplete="off">

            {/* Email */}
            <div style={{ animation: mounted ? 'fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) ' + delays.email + ' both' : 'none' }}>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  style={{ color: focused==='email' ? 'rgba(99,102,241,0.9)' : 'rgba(100,116,139,0.7)', transition: 'color 0.2s ease' }} />
                <input
                  type="email" placeholder="you@company.com" value={form.email}
                  autoComplete="off"
                  onChange={function(e) { setForm(function(f) { return {...f, email: e.target.value} }) }}
                  onFocus={function() { setFocused('email') }} onBlur={function() { setFocused('') }}
                  required
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-white placeholder-slate-600 outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: focused==='email' ? '1px solid rgba(99,102,241,0.7)' : '1px solid rgba(255,255,255,0.1)',
                    boxShadow: focused==='email' ? '0 0 0 3px rgba(99,102,241,0.15), inset 0 1px 0 rgba(255,255,255,0.04)' : 'none',
                    transition: 'border 0.2s ease, box-shadow 0.2s ease',
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ animation: mounted ? 'fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) ' + delays.password + ' both' : 'none' }}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
                <a href="/forgot-password" className="text-xs text-indigo-400 font-medium"
                  style={{ transition: 'color 0.15s ease' }}
                  onMouseEnter={function(e) { e.target.style.color='rgba(165,180,252,1)' }}
                  onMouseLeave={function(e) { e.target.style.color='rgba(129,140,248,1)' }}>
                  Forgot?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  style={{ color: focused==='password' ? 'rgba(99,102,241,0.9)' : 'rgba(100,116,139,0.7)', transition: 'color 0.2s ease' }} />
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••" value={form.password}
                  autoComplete="new-password"
                  onChange={function(e) { setForm(function(f) { return {...f, password: e.target.value} }) }}
                  onFocus={function() { setFocused('password') }} onBlur={function() { setFocused('') }}
                  required
                  className="w-full pl-11 pr-11 py-3.5 rounded-xl text-sm text-white placeholder-slate-600 outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: focused==='password' ? '1px solid rgba(99,102,241,0.7)' : '1px solid rgba(255,255,255,0.1)',
                    boxShadow: focused==='password' ? '0 0 0 3px rgba(99,102,241,0.15), inset 0 1px 0 rgba(255,255,255,0.04)' : 'none',
                    transition: 'border 0.2s ease, box-shadow 0.2s ease',
                  }}
                />
                <button type="button" onClick={function() { setShowPwd(function(v){return !v}) }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  style={{ transition: 'color 0.15s ease' }} tabIndex={-1}>
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit button — hover scale + shadow + shimmer sweep */}
            <div style={{ animation: mounted ? 'fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) ' + delays.btn + ' both' : 'none' }}>
              <button type="submit" disabled={loading}
                className="btn-primary-auth relative w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 mt-2 overflow-hidden"
                style={{ background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', boxShadow: loading ? 'none' : '0 8px 25px rgba(99,102,241,0.35)', transition: 'transform 0.15s ease, box-shadow 0.2s ease' }}>
                <span className="shimmer-sweep" />
                {loading ? <span className="spinner w-4 h-4 border-white/30 border-t-white" /> : <>Sign In to Dashboard <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6"
            style={{ animation: mounted ? 'fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) ' + delays.divider + ' both' : 'none' }}>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <span className="text-xs text-slate-600 font-medium">NEW HERE?</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* Register link */}
          <div style={{ animation: mounted ? 'fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) ' + delays.register + ' both' : 'none' }}>
            <Link to="/register"
              className="btn-secondary-auth flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-semibold text-slate-300"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', transition: 'background 0.2s ease, border-color 0.2s ease, color 0.2s ease' }}>
              Create a free account <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <p className="text-center text-xs text-slate-600 mt-6"
            style={{ animation: mounted ? 'fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) ' + delays.footer + ' both' : 'none' }}>
            Protected by enterprise-grade encryption · © 2026 AI JobFlow
          </p>
        </div>
      </div>

      <style>{`
        /* ── Keyframes ─────────────────────────────────────────────── */
        @keyframes shimmer {
          0%   { background-position: 0% center }
          100% { background-position: 200% center }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px) }
          to   { opacity: 1; transform: translateY(0)    }
        }
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-10px) }
          to   { opacity: 1; transform: translateY(0)     }
        }
        @keyframes slideDown {
          from { opacity: 0; max-height: 0;    transform: translateY(-4px) }
          to   { opacity: 1; max-height: 60px; transform: translateY(0)    }
        }
        @keyframes shake {
          0%,100% { transform: translateX(0)   }
          15%     { transform: translateX(-7px) }
          30%     { transform: translateX(6px)  }
          45%     { transform: translateX(-5px) }
          60%     { transform: translateX(4px)  }
          75%     { transform: translateX(-3px) }
          90%     { transform: translateX(2px)  }
        }
        @keyframes shimmerSweep {
          0%   { transform: translateX(-120%) skewX(-15deg) }
          100% { transform: translateX(220%)  skewX(-15deg) }
        }

        /* ── Stat card hover lift ──────────────────────────────────── */
        .stat-card {
          transition: transform 0.22s cubic-bezier(0.16,1,0.3,1), box-shadow 0.22s ease;
        }
        .stat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 28px rgba(99,102,241,0.18);
        }

        /* ── Primary button: hover scale + shadow ──────────────────── */
        .btn-primary-auth {
          transition: transform 0.15s ease, box-shadow 0.2s ease !important;
        }
        .btn-primary-auth:not(:disabled):hover {
          transform: scale(1.015) !important;
          box-shadow: 0 12px 32px rgba(99,102,241,0.5) !important;
        }
        .btn-primary-auth:not(:disabled):active {
          transform: scale(0.985) !important;
          box-shadow: 0 4px 12px rgba(99,102,241,0.3) !important;
        }

        /* ── Shimmer sweep on button hover ─────────────────────────── */
        .shimmer-sweep {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.14) 50%, transparent 100%);
          transform: translateX(-120%) skewX(-15deg);
          pointer-events: none;
        }
        .btn-primary-auth:not(:disabled):hover .shimmer-sweep {
          animation: shimmerSweep 0.65s ease forwards;
        }

        /* ── Secondary button hover ────────────────────────────────── */
        .btn-secondary-auth:hover {
          background: rgba(255,255,255,0.09) !important;
          border-color: rgba(255,255,255,0.2) !important;
          color: white !important;
        }
      `}</style>
    </div>
  )
}