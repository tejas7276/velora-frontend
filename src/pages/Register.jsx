import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Lock, Shield, Zap, AlertCircle, ArrowRight, Check } from 'lucide-react'
import { register } from '../api/auth'
import { useAuth } from '../context/AuthContext'

// ── Neural canvas — same as Login, intentionally consistent ──────────────
function NeuralCanvas() {
  var canvasRef = useRef(null)
  useEffect(function() {
    var canvas = canvasRef.current
    if (!canvas) return
    var ctx = canvas.getContext('2d')
    var W = canvas.width  = canvas.offsetWidth
    var H = canvas.height = canvas.offsetHeight
    var nodes = []
    for (var i = 0; i < 45; i++) {
      nodes.push({
        x: Math.random()*W, y: Math.random()*H,
        vx: (Math.random()-0.5)*0.35, vy: (Math.random()-0.5)*0.35,
        r: Math.random()*1.5+1, pulse: Math.random()*Math.PI*2
      })
    }
    var raf
    function draw() {
      ctx.clearRect(0, 0, W, H)
      nodes.forEach(function(n) {
        n.x += n.vx; n.y += n.vy; n.pulse += 0.02
        if (n.x < 0 || n.x > W) n.vx *= -1
        if (n.y < 0 || n.y > H) n.vy *= -1
      })
      for (var a = 0; a < nodes.length; a++) {
        for (var b = a+1; b < nodes.length; b++) {
          var dx = nodes[a].x-nodes[b].x, dy = nodes[a].y-nodes[b].y
          var d  = Math.sqrt(dx*dx+dy*dy)
          if (d < 100) {
            ctx.beginPath()
            ctx.strokeStyle = 'rgba(139,92,246,'+(1-d/100)*0.2+')'
            ctx.lineWidth = 0.5
            ctx.moveTo(nodes[a].x, nodes[a].y)
            ctx.lineTo(nodes[b].x, nodes[b].y)
            ctx.stroke()
          }
        }
      }
      nodes.forEach(function(n) {
        var g = (Math.sin(n.pulse)+1)/2
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r+g, 0, Math.PI*2)
        ctx.fillStyle = 'rgba(167,139,250,'+(0.3+g*0.4)+')'
        ctx.fill()
      })
      raf = requestAnimationFrame(draw)
    }
    draw()
    return function() { cancelAnimationFrame(raf) }
  }, [])
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
}

// ── Password strength meter — animated bar fill ───────────────────────────
function PasswordStrength({ password }) {
  var checks = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'Contains number',        ok: /\d/.test(password)  },
    { label: 'Contains uppercase',     ok: /[A-Z]/.test(password) },
  ]
  var score  = checks.filter(function(c) { return c.ok }).length
  var colors = ['bg-red-500','bg-red-500','bg-amber-400','bg-emerald-500']
  if (!password) return null
  return (
    <div className="mt-2.5 strength-enter">
      <div className="flex gap-1 mb-2">
        {[0,1,2].map(function(i) {
          var filled = i < score
          return (
            <div key={i}
              className={'h-1 flex-1 rounded-full strength-bar ' + (filled ? colors[score] : 'bg-slate-700')}
              style={{ transitionDelay: filled ? i * 0.06 + 's' : '0s' }} />
          )
        })}
      </div>
      <div className="flex flex-col gap-1">
        {checks.map(function(c) {
          return (
            <div key={c.label} className="flex items-center gap-1.5 text-xs check-item"
              style={{ color: c.ok ? '#34d399' : 'rgba(148,163,184,0.6)' }}>
              <span className="check-icon" style={{ opacity: c.ok ? 1 : 0.4 }}>
                {c.ok ? '✓' : '○'}
              </span>
              <span>{c.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────
export default function Register() {
  var [form,    setForm]    = useState({ name:'', email:'', password:'', confirm:'' })
  var [agreed,  setAgreed]  = useState(false)
  var [error,   setError]   = useState('')
  var [loading, setLoading] = useState(false)
  var [focused, setFocused] = useState('')
  var [mounted, setMounted] = useState(false)
  var [shakeKey, setShakeKey] = useState(0)
  var { saveAuth } = useAuth()
  var navigate     = useNavigate()

  useEffect(function() {
    var t = setTimeout(function() { setMounted(true) }, 50)
    return function() { clearTimeout(t) }
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    if (form.password !== form.confirm) {
      setError('Passwords do not match')
      setShakeKey(function(k) { return k + 1 })
      return
    }
    if (!agreed) {
      setError('Please agree to the Terms of Service')
      setShakeKey(function(k) { return k + 1 })
      return
    }
    setError(''); setLoading(true)
    register({ name: form.name, email: form.email, password: form.password })
      .then(function(res) { saveAuth(res.data); navigate('/dashboard') })
      .catch(function(err) {
        setError(err.response?.data?.message || 'Registration failed')
        setShakeKey(function(k) { return k + 1 })
      })
      .finally(function() { setLoading(false) })
  }

  function inputStyle(field) {
    var active = focused === field
    return {
      background: 'rgba(255,255,255,0.06)',
      border:     active ? '1px solid rgba(139,92,246,0.75)' : '1px solid rgba(255,255,255,0.1)',
      boxShadow:  active
        ? '0 0 0 3px rgba(139,92,246,0.18), inset 0 1px 0 rgba(255,255,255,0.04)'
        : 'none',
      transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
    }
  }

  // Confirm field border — validation feedback color
  function confirmStyle() {
    if (!form.confirm) return inputStyle('confirm')
    if (form.confirm !== form.password) {
      return { ...inputStyle('confirm'), border: '1px solid rgba(239,68,68,0.7)', boxShadow: '0 0 0 3px rgba(239,68,68,0.1)' }
    }
    return { ...inputStyle('confirm'), border: '1px solid rgba(34,197,94,0.7)', boxShadow: '0 0 0 3px rgba(34,197,94,0.1)' }
  }

var features = [
  '🤖 15+ AI-powered job types',
  '⚡ Smart priority-based processing',
  '📊 Live job tracking & analytics',
  '⏱️ Automated scheduling & execution',
];

  return (
    <div className="min-h-screen flex overflow-hidden"
      style={{ background: 'linear-gradient(135deg,#0f0c29 0%,#1a1548 50%,#0f0c29 100%)' }}>

      {/* ── LEFT PANEL ─────────────────────────────────────────────────── */}
      <div className="hidden lg:flex w-[45%] flex-col relative overflow-hidden lp-enter"
        style={{ animationPlayState: mounted ? 'running' : 'paused' }}>
        <div className="absolute inset-0">
          <NeuralCanvas />
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg,rgba(139,92,246,0.12) 0%,rgba(99,102,241,0.06) 100%)' }} />
        </div>
        <div className="relative z-10 flex flex-col h-full p-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-auto stagger-1"
            style={{ animationPlayState: mounted ? 'running' : 'paused' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center logo-pulse"
              style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', boxShadow: '0 0 20px rgba(139,92,246,0.4)' }}>
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-base tracking-tight">Velora</span>
          </div>

          {/* Hero copy */}
          <div className="my-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 stagger-2"
              style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', animationPlayState: mounted ? 'running' : 'paused' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
              <span className="text-xs text-indigo-300 font-medium tracking-wide italic">
                Move at the speed of thought.
              </span>
            </div>
            <p className="text-xs font-semibold text-violet-400 tracking-widest mb-4 uppercase stagger-3"
              style={{ animationPlayState: mounted ? 'running' : 'paused' }}>
              Join 2,400+ developers
            </p>
            <h1 className="text-4xl font-black text-white leading-tight mb-4 stagger-4"
              style={{ letterSpacing: '-0.02em', animationPlayState: mounted ? 'running' : 'paused' }}>
              Start building<br />
              <span style={{ background: 'linear-gradient(90deg,#a78bfa,#818cf8,#a78bfa)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'shimmer 3s linear infinite' }}>
                smarter AI apps.
              </span>
            </h1>

            {/* Feature list — staggered */}
            <div className="flex flex-col gap-3 mt-8">
              {features.map(function(f, idx) {
                return (
                  <div key={f} className="flex items-center gap-3 feature-item"
                    style={{ animationDelay: (0.42 + idx * 0.07) + 's', animationPlayState: mounted ? 'running' : 'paused' }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 check-circle"
                      style={{ background: 'rgba(139,92,246,0.3)', border: '1px solid rgba(139,92,246,0.5)' }}>
                      <Check className="w-3 h-3 text-violet-300" />
                    </div>
                    <span className="text-sm text-slate-300">{f}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Testimonial */}
          <div className="mt-auto p-4 rounded-xl stagger-8"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', animationPlayState: mounted ? 'running' : 'paused' }}>
            <p className="text-xs text-slate-400 leading-relaxed">
              "Velora reduced our LLM pipeline processing time by 60%. The priority queue is exactly what we needed."
            </p>
            <p className="text-xs text-violet-400 font-semibold mt-2">— Build by Tejas 🪽</p>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL — form ──────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto rp-enter"
        style={{ animationPlayState: mounted ? 'running' : 'paused' }}>
        <div className="w-full max-w-md">

          {/* Heading */}
          <div className="mb-7 stagger-1" style={{ animationPlayState: mounted ? 'running' : 'paused' }}>
            <h2 className="text-3xl font-black text-white mb-2" style={{ letterSpacing: '-0.02em' }}>
              Create account
            </h2>
            <p className="text-slate-400">Free forever. No credit card required.</p>
          </div>

          {/* Error banner */}
          {error && (
            <div key={shakeKey}
              className="flex items-center gap-2 p-3 rounded-xl border border-red-500/30 bg-red-500/10 mb-5 text-sm text-red-400 error-banner">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Name */}
            <div className="stagger-2" style={{ animationPlayState: mounted ? 'running' : 'paused' }}>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none icon-transition"
                  style={{ color: focused === 'name' ? 'rgba(139,92,246,0.9)' : 'rgba(148,163,184,0.5)' }} />
                <input type="text" placeholder="Alex Rivers" value={form.name} required
                  onChange={function(e) { setForm(function(f) { return { ...f, name: e.target.value } }) }}
                  onFocus={function() { setFocused('name') }}
                  onBlur={function()  { setFocused('') }}
                  className="w-full pl-11 pr-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 outline-none"
                  style={inputStyle('name')} />
              </div>
            </div>

            {/* Email */}
            <div className="stagger-3" style={{ animationPlayState: mounted ? 'running' : 'paused' }}>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none icon-transition"
                  style={{ color: focused === 'email' ? 'rgba(139,92,246,0.9)' : 'rgba(148,163,184,0.5)' }} />
                <input type="email" placeholder="alex@company.ai" value={form.email} required
                  onChange={function(e) { setForm(function(f) { return { ...f, email: e.target.value } }) }}
                  onFocus={function() { setFocused('email') }}
                  onBlur={function()  { setFocused('') }}
                  className="w-full pl-11 pr-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 outline-none"
                  style={inputStyle('email')} />
              </div>
            </div>

            {/* Password */}
            <div className="stagger-4" style={{ animationPlayState: mounted ? 'running' : 'paused' }}>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none icon-transition"
                  style={{ color: focused === 'password' ? 'rgba(139,92,246,0.9)' : 'rgba(148,163,184,0.5)' }} />
                <input type="password" placeholder="Min. 8 characters" value={form.password} required
                  onChange={function(e) { setForm(function(f) { return { ...f, password: e.target.value } }) }}
                  onFocus={function() { setFocused('password') }}
                  onBlur={function()  { setFocused('') }}
                  className="w-full pl-11 pr-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 outline-none"
                  style={inputStyle('password')} />
              </div>
              <PasswordStrength password={form.password} />
            </div>

            {/* Confirm */}
            <div className="stagger-5" style={{ animationPlayState: mounted ? 'running' : 'paused' }}>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Confirm Password</label>
              <div className="relative">
                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none icon-transition"
                  style={{ color: focused === 'confirm' ? 'rgba(139,92,246,0.9)' : 'rgba(148,163,184,0.5)' }} />
                <input type="password" placeholder="Repeat password" value={form.confirm} required
                  onChange={function(e) { setForm(function(f) { return { ...f, confirm: e.target.value } }) }}
                  onFocus={function() { setFocused('confirm') }}
                  onBlur={function()  { setFocused('') }}
                  className="w-full pl-11 pr-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 outline-none"
                  style={confirmStyle()} />
                {/* Checkmark fades in when passwords match */}
                {form.confirm && form.confirm === form.password && (
                  <Check className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 check-appear" />
                )}
              </div>
            </div>

            {/* Terms checkbox */}
            <label className="flex items-start gap-3 cursor-pointer mt-1 stagger-6"
              style={{ animationPlayState: mounted ? 'running' : 'paused' }}>
              <div
                onClick={function() { setAgreed(function(v) { return !v }) }}
                className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 cursor-pointer checkbox-btn"
                style={{
                  background: agreed ? 'linear-gradient(135deg,#8b5cf6,#6366f1)' : 'rgba(255,255,255,0.06)',
                  border:     agreed ? 'none' : '1px solid rgba(255,255,255,0.2)',
                }}>
                {agreed && <Check className="w-3 h-3 text-white check-appear" />}
              </div>
              <span className="text-xs text-slate-400 leading-relaxed">
                I agree to the{' '}
                <a href="#" className="text-violet-400 hover:text-violet-300 transition-colors">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-violet-400 hover:text-violet-300 transition-colors">Privacy Policy</a>
              </span>
            </label>

            {/* Submit */}
            <div className="stagger-7" style={{ animationPlayState: mounted ? 'running' : 'paused' }}>
              <button type="submit" disabled={loading}
                className="submit-btn relative w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 mt-1 overflow-hidden"
                style={{
                  background: loading ? 'rgba(139,92,246,0.5)' : 'linear-gradient(135deg,#8b5cf6 0%,#6366f1 100%)',
                  boxShadow:  loading ? 'none'                  : '0 8px 25px rgba(139,92,246,0.35)',
                }}>
                <span className="shimmer-overlay" />
                {loading
                  ? <span className="spinner w-4 h-4 border-white/30 border-t-white" />
                  : <><span>Create Account</span><ArrowRight className="w-4 h-4 btn-arrow" /></>
                }
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5 stagger-8"
            style={{ animationPlayState: mounted ? 'running' : 'paused' }}>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <span className="text-xs text-slate-600">HAVE AN ACCOUNT?</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>

          <div className="stagger-9" style={{ animationPlayState: mounted ? 'running' : 'paused' }}>
            <Link to="/login" className="ghost-btn flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold text-slate-300"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              Sign in instead <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        /* ── Keyframes ─────────────────────────────────────────────────── */
        @keyframes shimmer {
          0%   { background-position: 0%   center }
          100% { background-position: 200% center }
        }
        @keyframes shake {
          0%,100% { transform: translateX(0)    }
          14%     { transform: translateX(-8px)  }
          28%     { transform: translateX(7px)   }
          42%     { transform: translateX(-6px)  }
          56%     { transform: translateX(4px)   }
          70%     { transform: translateX(-3px)  }
          84%     { transform: translateX(2px)   }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px) }
          to   { opacity: 1; transform: translateY(0)    }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px) }
          to   { opacity: 1; transform: translateY(0)    }
        }
        @keyframes panelLeft {
          from { opacity: 0; transform: translateX(-36px) }
          to   { opacity: 1; transform: translateX(0)     }
        }
        @keyframes panelRight {
          from { opacity: 0; transform: translateX(36px) }
          to   { opacity: 1; transform: translateX(0)    }
        }
        @keyframes logoPulse {
          0%,100% { box-shadow: 0 0 20px rgba(139,92,246,0.4) }
          50%     { box-shadow: 0 0 32px rgba(139,92,246,0.65), 0 0 60px rgba(99,102,241,0.2) }
        }
        @keyframes btnShimmer {
          0%   { transform: translateX(-100%) skewX(-12deg); opacity:0 }
          40%  { opacity: 0.12 }
          100% { transform: translateX(220%)  skewX(-12deg); opacity:0 }
        }
        @keyframes arrowNudge {
          0%,100% { transform: translateX(0)   }
          50%     { transform: translateX(3px)  }
        }
        @keyframes popIn {
          0%   { opacity:0; transform: scale(0.5) }
          70%  { transform: scale(1.15) }
          100% { opacity:1; transform: scale(1)   }
        }
        @keyframes strengthSlide {
          from { opacity:0; transform: translateY(-4px) }
          to   { opacity:1; transform: translateY(0)    }
        }

        /* ── Panels ────────────────────────────────────────────────────── */
        .lp-enter {
          animation: panelLeft  0.75s cubic-bezier(0.16,1,0.3,1) both;
          animation-play-state: paused;
        }
        .rp-enter {
          animation: panelRight 0.75s cubic-bezier(0.16,1,0.3,1) 0.08s both;
          animation-play-state: paused;
        }

        /* ── Stagger classes ───────────────────────────────────────────── */
        .stagger-1 { animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.22s both; animation-play-state: paused }
        .stagger-2 { animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.29s both; animation-play-state: paused }
        .stagger-3 { animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.35s both; animation-play-state: paused }
        .stagger-4 { animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.41s both; animation-play-state: paused }
        .stagger-5 { animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.46s both; animation-play-state: paused }
        .stagger-6 { animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.51s both; animation-play-state: paused }
        .stagger-7 { animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.56s both; animation-play-state: paused }
        .stagger-8 { animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.60s both; animation-play-state: paused }
        .stagger-9 { animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.64s both; animation-play-state: paused }

        /* Feature list items */
        .feature-item {
          animation: fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) both;
          animation-play-state: paused;
        }

        /* ── Error banner ──────────────────────────────────────────────── */
        .error-banner {
          animation: slideDown 0.3s cubic-bezier(0.16,1,0.3,1) both,
                     shake      0.48s cubic-bezier(0.36,0.07,0.19,0.97) 0.05s both;
        }

        /* ── Logo ──────────────────────────────────────────────────────── */
        .logo-pulse { animation: logoPulse 3s ease-in-out infinite }

        /* ── Icon color transition ─────────────────────────────────────── */
        .icon-transition { transition: color 0.18s ease }

        /* ── Password strength meter ───────────────────────────────────── */
        .strength-enter {
          animation: strengthSlide 0.25s cubic-bezier(0.16,1,0.3,1) both;
        }
        .strength-bar {
          transition: background-color 0.3s ease, opacity 0.3s ease;
        }
        .check-item {
          transition: color 0.2s ease;
        }

        /* ── Check appear (confirm match / checkbox) ───────────────────── */
        .check-appear { animation: popIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both }

        /* ── Checkbox ──────────────────────────────────────────────────── */
        .checkbox-btn {
          transition: background 0.2s ease, border-color 0.2s ease,
                      transform 0.15s cubic-bezier(0.34,1.56,0.64,1);
        }
        .checkbox-btn:hover { transform: scale(1.1) }
        .checkbox-btn:active { transform: scale(0.92) }

        /* ── Submit button ─────────────────────────────────────────────── */
        .submit-btn {
          transition: transform 0.14s cubic-bezier(0.16,1,0.3,1),
                      box-shadow 0.2s ease;
          cursor: pointer;
        }
        .submit-btn:not(:disabled):hover {
          transform: scale(1.016);
          box-shadow: 0 12px 32px rgba(139,92,246,0.48) !important;
        }
        .submit-btn:not(:disabled):active {
          transform: scale(0.984);
          box-shadow: 0 4px 12px rgba(139,92,246,0.28) !important;
          transition-duration: 0.08s;
        }
        .shimmer-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(90deg,transparent,rgba(255,255,255,0.14),transparent);
          transform: translateX(-100%) skewX(-12deg);
          pointer-events: none;
        }
        .submit-btn:not(:disabled):hover .shimmer-overlay {
          animation: btnShimmer 0.65s ease forwards;
        }
        .submit-btn:not(:disabled):hover .btn-arrow {
          animation: arrowNudge 0.5s ease infinite;
        }

        /* ── Ghost button ──────────────────────────────────────────────── */
        .ghost-btn {
          transition: background 0.2s ease, border-color 0.2s ease,
                      color 0.2s ease, transform 0.15s cubic-bezier(0.16,1,0.3,1);
        }
        .ghost-btn:hover {
          background: rgba(255,255,255,0.09) !important;
          border-color: rgba(255,255,255,0.22) !important;
          color: white !important;
          transform: scale(1.008);
        }
        .ghost-btn:active { transform: scale(0.992); transition-duration: 0.08s }
      `}</style>
    </div>
  )
}