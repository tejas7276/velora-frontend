import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Lock, ArrowRight, CheckCircle, Zap, AlertCircle, Shield, Eye, EyeOff } from 'lucide-react'
import api from '../api/axios'

// ── Password input with show/hide toggle ──────────────────────────────────
function PasswordInput({ value, onChange, placeholder, style }) {
  var [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
      <input
        type={show ? 'text' : 'password'}
        autoComplete="new-password"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required
        className="w-full pl-11 pr-11 py-3 rounded-xl text-sm text-white placeholder-slate-600 outline-none"
        style={style}
      />
      <button
        type="button"
        onClick={function() { setShow(function(v) { return !v }) }}
        className="eye-btn absolute right-4 top-1/2 -translate-y-1/2"
        tabIndex={-1}>
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  )
}

// ── Step indicator — shows progress through email → code → done ──────────
function StepIndicator({ step }) {
  var steps = ['email', 'code', 'done']
  var idx   = steps.indexOf(step)
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map(function(s, i) {
        var done    = i < idx
        var current = i === idx
        return (
          <div key={s} className="flex items-center gap-2">
            <div className={'step-dot ' + (done ? 'step-done' : current ? 'step-active' : 'step-inactive')}>
              {done ? <CheckCircle className="w-3 h-3" /> : <span className="text-[10px] font-bold">{i+1}</span>}
            </div>
            {i < steps.length - 1 && (
              <div className={'step-line ' + (done ? 'step-line-done' : 'step-line-pending')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────
export default function ForgotPassword() {
  var [step,     setStep]     = useState('email')
  var [email,    setEmail]    = useState('')
  var [code,     setCode]     = useState('')
  var [password, setPassword] = useState('')
  var [confirm,  setConfirm]  = useState('')
  var [loading,  setLoading]  = useState(false)
  var [error,    setError]    = useState('')
  var [mounted,  setMounted]  = useState(false)
  var [shakeKey, setShakeKey] = useState(0)
  var [focused,  setFocused]  = useState('')

  useEffect(function() {
    var t = setTimeout(function() { setMounted(true) }, 60)
    return function() { clearTimeout(t) }
  }, [])

  // Reset mount state on step change to re-trigger stagger animations
  function goToStep(next) {
    setMounted(false)
    setError('')
    setTimeout(function() {
      setStep(next)
      setTimeout(function() { setMounted(true) }, 30)
    }, 120)
  }

  function submitEmail(e) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true); setError('')
    api.post('/auth/forgot-password?email=' + encodeURIComponent(email.trim()))
      .then(function()  { goToStep('code') })
      .catch(function() { goToStep('code') })   // still advance — security: don't reveal email existence
      .finally(function() { setLoading(false) })
  }

  function submitReset(e) {
    e.preventDefault()
    if (code.length !== 6)   { setError('Enter the 6-digit code from your email'); setShakeKey(function(k) { return k+1 }); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); setShakeKey(function(k) { return k+1 }); return }
    if (password !== confirm) { setError('Passwords do not match');                setShakeKey(function(k) { return k+1 }); return }
    setLoading(true); setError('')
    var params = '?email=' + encodeURIComponent(email) +
                 '&code='  + encodeURIComponent(code)  +
                 '&newPassword=' + encodeURIComponent(password)
    api.post('/auth/reset-password' + params)
      .then(function()   { goToStep('done') })
      .catch(function(e) {
        setError(e.response?.data?.message || 'Invalid or expired code. Please try again.')
        setShakeKey(function(k) { return k+1 })
      })
      .finally(function() { setLoading(false) })
  }

  var inputBase = {
    background: 'rgba(255,255,255,0.06)',
    border:     '1px solid rgba(255,255,255,0.12)',
    transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
  }

  function inputStyle(field) {
    var active = focused === field
    return {
      ...inputBase,
      border:    active ? '1px solid rgba(139,92,246,0.75)' : inputBase.border,
      boxShadow: active ? '0 0 0 3px rgba(139,92,246,0.18), inset 0 1px 0 rgba(255,255,255,0.04)' : 'none',
    }
  }

  function confirmBorderStyle() {
    if (!confirm) return inputBase
    if (confirm !== password) return { ...inputBase, border: '1px solid rgba(239,68,68,0.6)', boxShadow: '0 0 0 3px rgba(239,68,68,0.1)' }
    return { ...inputBase, border: '1px solid rgba(34,197,94,0.6)', boxShadow: '0 0 0 3px rgba(34,197,94,0.1)' }
  }

  var card = {
    background:    'rgba(255,255,255,0.04)',
    border:        '1px solid rgba(255,255,255,0.1)',
    backdropFilter:'blur(16px)',
  }

  var primaryBtn = {
    background: 'linear-gradient(135deg,#8b5cf6,#6366f1)',
    boxShadow:  '0 8px 25px rgba(139,92,246,0.3)',
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg,#0f0c29 0%,#1a1548 50%,#0f0c29 100%)' }}>
      <div className="w-full max-w-md page-enter" style={{ animationPlayState: mounted ? 'running' : 'paused' }}>

        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8 stagger-1"
          style={{ animationPlayState: mounted ? 'running' : 'paused' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center logo-pulse"
            style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', boxShadow: '0 0 20px rgba(139,92,246,0.4)' }}>
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-base">Velora</span>
        </div>

        {/* Step indicator */}
        <div className="stagger-2" style={{ animationPlayState: mounted ? 'running' : 'paused' }}>
          <StepIndicator step={step} />
        </div>

        {/* ── STEP 1: Email ────────────────────────────────────────────── */}
        {step === 'email' && (
          <div className="rounded-2xl p-8 card-enter" style={{ ...card, animationPlayState: mounted ? 'running' : 'paused' }}>
            {/* Icon */}
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-5 icon-float stagger-3"
              style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)', animationPlayState: mounted ? 'running' : 'paused' }}>
              <Mail className="w-5 h-5 text-violet-400" />
            </div>
            <h1 className="text-xl font-black text-white text-center mb-1.5 stagger-4"
              style={{ letterSpacing: '-0.02em', animationPlayState: mounted ? 'running' : 'paused' }}>
              Forgot your password?
            </h1>
            <p className="text-sm text-slate-400 text-center mb-7 stagger-5"
              style={{ animationPlayState: mounted ? 'running' : 'paused' }}>
              Enter your email and we'll send a 6-digit reset code.
            </p>

            {error && (
              <div key={shakeKey} className="flex items-center gap-2 p-3 rounded-xl border border-red-500/30 bg-red-500/10 mb-4 text-sm text-red-400 error-banner">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            <form onSubmit={submitEmail} className="flex flex-col gap-4" autoComplete="off">
              <div className="stagger-6" style={{ animationPlayState: mounted ? 'running' : 'paused' }}>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none icon-transition"
                    style={{ color: focused === 'email' ? 'rgba(139,92,246,0.9)' : 'rgba(148,163,184,0.5)' }} />
                  <input
                    type="email" autoComplete="off" required
                    placeholder="you@example.com" value={email}
                    onChange={function(e) { setEmail(e.target.value) }}
                    onFocus={function() { setFocused('email') }}
                    onBlur={function()  { setFocused('') }}
                    className="w-full pl-11 pr-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 outline-none"
                    style={inputStyle('email')} />
                </div>
              </div>
              <div className="stagger-7" style={{ animationPlayState: mounted ? 'running' : 'paused' }}>
                <button type="submit" disabled={loading}
                  className="submit-btn relative w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 overflow-hidden"
                  style={primaryBtn}>
                  <span className="shimmer-overlay" />
                  {loading
                    ? <span className="spinner w-4 h-4" />
                    : <><span>Send Reset Code</span><ArrowRight className="w-4 h-4 btn-arrow" /></>
                  }
                </button>
              </div>
            </form>

            <p className="text-center mt-5 text-sm text-slate-500 stagger-8"
              style={{ animationPlayState: mounted ? 'running' : 'paused' }}>
              Remember it?{' '}
              <Link to="/login" className="text-violet-400 font-semibold hover:text-violet-300 transition-colors">Back to login</Link>
            </p>
          </div>
        )}

        {/* ── STEP 2: Code + New Password ─────────────────────────────── */}
        {step === 'code' && (
          <div className="rounded-2xl p-8 card-enter" style={{ ...card, animationPlayState: mounted ? 'running' : 'paused' }}>
            {/* Icon */}
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-5 icon-float stagger-3"
              style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', animationPlayState: mounted ? 'running' : 'paused' }}>
              <Shield className="w-5 h-5 text-indigo-400" />
            </div>
            <h1 className="text-xl font-black text-white text-center mb-1.5 stagger-4"
              style={{ letterSpacing: '-0.02em', animationPlayState: mounted ? 'running' : 'paused' }}>
              Check your inbox
            </h1>
            <div className="text-center mb-7 stagger-5" style={{ animationPlayState: mounted ? 'running' : 'paused' }}>
              <p className="text-sm text-slate-400 mb-1">Code sent to</p>
              <p className="text-sm font-semibold text-violet-400">{email}</p>
            </div>

            {error && (
              <div key={shakeKey} className="flex items-center gap-2 p-3 rounded-xl border border-red-500/30 bg-red-500/10 mb-4 text-sm text-red-400 error-banner">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            <form onSubmit={submitReset} className="flex flex-col gap-4" autoComplete="off">

              {/* OTP input — pulses when 6 digits complete */}
              <div className="stagger-6" style={{ animationPlayState: mounted ? 'running' : 'paused' }}>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">6-Digit Code</label>
                <input
                  type="text" autoComplete="one-time-code" required
                  maxLength={6} placeholder="• • • • • •" value={code}
                  onChange={function(e) { setCode(e.target.value.replace(/\D/g,'').slice(0,6)) }}
                  className={'w-full px-4 py-4 rounded-xl text-3xl font-mono font-black text-white text-center placeholder-slate-700 outline-none tracking-[0.5em] otp-input' + (code.length === 6 ? ' otp-complete' : '')}
                  style={{
                    ...inputBase,
                    border:    code.length === 6 ? '1px solid rgba(139,92,246,0.7)' : inputBase.border,
                    boxShadow: code.length === 6 ? '0 0 0 3px rgba(139,92,246,0.2), 0 0 20px rgba(139,92,246,0.1)' : 'none',
                    transition: 'border-color 0.2s ease, box-shadow 0.3s ease',
                  }} />
                <p className="text-xs text-slate-500 text-center mt-1.5">Expires in 15 minutes</p>
              </div>

              {/* New password */}
              <div className="stagger-7" style={{ animationPlayState: mounted ? 'running' : 'paused' }}>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">New Password</label>
                <PasswordInput
                  value={password}
                  onChange={function(e) { setPassword(e.target.value) }}
                  placeholder="Min. 6 characters"
                  style={inputBase} />
              </div>

              {/* Confirm password */}
              <div className="stagger-8" style={{ animationPlayState: mounted ? 'running' : 'paused' }}>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Confirm Password</label>
                <div className="relative">
                  <PasswordInput
                    value={confirm}
                    onChange={function(e) { setConfirm(e.target.value) }}
                    placeholder="Repeat password"
                    style={confirmBorderStyle()} />
                  {confirm && confirm === password && (
                    <CheckCircle className="absolute right-11 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 check-appear pointer-events-none" />
                  )}
                </div>
              </div>

              <div className="stagger-9" style={{ animationPlayState: mounted ? 'running' : 'paused' }}>
                <button type="submit" disabled={loading}
                  className="submit-btn relative w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 mt-1 overflow-hidden"
                  style={primaryBtn}>
                  <span className="shimmer-overlay" />
                  {loading
                    ? <span className="spinner w-4 h-4" />
                    : <><span>Reset Password</span><ArrowRight className="w-4 h-4 btn-arrow" /></>
                  }
                </button>
              </div>
            </form>

            <button onClick={function() { goToStep('email') }}
              className="w-full text-center mt-4 text-xs text-slate-500 back-btn">
              ← Use a different email
            </button>
          </div>
        )}

        {/* ── STEP 3: Success ──────────────────────────────────────────── */}
        {step === 'done' && (
          <div className="rounded-2xl p-8 text-center success-card" style={{ ...card, animationPlayState: mounted ? 'running' : 'paused' }}>
            {/* Success icon — bounces in */}
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 success-icon-wrap"
              style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}>
              <CheckCircle className="w-7 h-7 text-emerald-400" />
            </div>
            <h1 className="text-xl font-black text-white mb-2 stagger-4"
              style={{ letterSpacing: '-0.02em', animationPlayState: mounted ? 'running' : 'paused' }}>
              Password updated!
            </h1>
            <p className="text-sm text-slate-400 mb-7 leading-relaxed stagger-5"
              style={{ animationPlayState: mounted ? 'running' : 'paused' }}>
              Your password has been reset successfully.<br />
              You can now log in with your new password.
            </p>
            <div className="stagger-6" style={{ animationPlayState: mounted ? 'running' : 'paused' }}>
              <Link to="/login"
                className="submit-btn inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-bold text-white overflow-hidden relative"
                style={primaryBtn}>
                <span className="shimmer-overlay" />
                <span>Go to Login</span>
                <ArrowRight className="w-4 h-4 btn-arrow" />
              </Link>
            </div>
          </div>
        )}
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
          from { opacity: 0; transform: translateY(14px) }
          to   { opacity: 1; transform: translateY(0)    }
        }
        @keyframes pageEntry {
          from { opacity: 0; transform: translateY(24px) }
          to   { opacity: 1; transform: translateY(0)    }
        }
        @keyframes cardEntry {
          from { opacity: 0; transform: translateY(20px) scale(0.98) }
          to   { opacity: 1; transform: translateY(0)    scale(1)    }
        }
        @keyframes float {
          0%,100% { transform: translateY(0px)   }
          50%     { transform: translateY(-5px)   }
        }
        @keyframes logoPulse {
          0%,100% { box-shadow: 0 0 20px rgba(139,92,246,0.4) }
          50%     { box-shadow: 0 0 32px rgba(139,92,246,0.65), 0 0 60px rgba(99,102,241,0.2) }
        }
        @keyframes btnShimmer {
          0%   { transform: translateX(-100%) skewX(-12deg); opacity: 0  }
          40%  { opacity: 0.12 }
          100% { transform: translateX(220%)  skewX(-12deg); opacity: 0  }
        }
        @keyframes arrowNudge {
          0%,100% { transform: translateX(0)   }
          50%     { transform: translateX(3px)  }
        }
        @keyframes popIn {
          0%   { opacity: 0; transform: scale(0.5) rotate(-10deg) }
          60%  { transform: scale(1.2)  rotate(2deg) }
          100% { opacity: 1; transform: scale(1)   rotate(0deg) }
        }
        @keyframes successBounce {
          0%   { opacity: 0; transform: scale(0.4) rotate(-15deg) }
          50%  { transform: scale(1.18) rotate(3deg) }
          75%  { transform: scale(0.92) rotate(-1deg) }
          100% { opacity: 1; transform: scale(1)    rotate(0deg) }
        }
        @keyframes successPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(34,197,94,0)    }
          50%     { box-shadow: 0 0 0 8px rgba(34,197,94,0.12) }
        }
        @keyframes otpPulse {
          0%   { box-shadow: 0 0 0 3px rgba(139,92,246,0.2), 0 0 20px rgba(139,92,246,0.1) }
          50%  { box-shadow: 0 0 0 5px rgba(139,92,246,0.3), 0 0 30px rgba(139,92,246,0.18) }
          100% { box-shadow: 0 0 0 3px rgba(139,92,246,0.2), 0 0 20px rgba(139,92,246,0.1) }
        }

        /* ── Step indicator ────────────────────────────────────────────── */
        .step-dot {
          width: 24px; height: 24px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.3s ease, border-color 0.3s ease, transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
        }
        .step-active {
          background: linear-gradient(135deg,#8b5cf6,#6366f1);
          color: white;
          transform: scale(1.15);
          box-shadow: 0 0 12px rgba(139,92,246,0.45);
        }
        .step-done {
          background: rgba(34,197,94,0.2);
          border: 1px solid rgba(34,197,94,0.4);
          color: #34d399;
        }
        .step-inactive {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          color: rgba(148,163,184,0.5);
        }
        .step-line {
          width: 32px; height: 2px; border-radius: 1px;
          transition: background 0.4s ease;
        }
        .step-line-done    { background: rgba(34,197,94,0.4) }
        .step-line-pending { background: rgba(255,255,255,0.08) }

        /* ── Page entry ────────────────────────────────────────────────── */
        .page-enter {
          animation: pageEntry 0.6s cubic-bezier(0.16,1,0.3,1) both;
          animation-play-state: paused;
        }
        .card-enter {
          animation: cardEntry 0.45s cubic-bezier(0.16,1,0.3,1) 0.12s both;
          animation-play-state: paused;
        }

        /* ── Stagger ───────────────────────────────────────────────────── */
        .stagger-1 { animation: fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) 0.10s both; animation-play-state: paused }
        .stagger-2 { animation: fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) 0.18s both; animation-play-state: paused }
        .stagger-3 { animation: fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) 0.26s both; animation-play-state: paused }
        .stagger-4 { animation: fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) 0.32s both; animation-play-state: paused }
        .stagger-5 { animation: fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) 0.38s both; animation-play-state: paused }
        .stagger-6 { animation: fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) 0.44s both; animation-play-state: paused }
        .stagger-7 { animation: fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) 0.49s both; animation-play-state: paused }
        .stagger-8 { animation: fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) 0.54s both; animation-play-state: paused }
        .stagger-9 { animation: fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) 0.58s both; animation-play-state: paused }

        /* ── Error banner ──────────────────────────────────────────────── */
        .error-banner {
          animation: slideDown 0.28s cubic-bezier(0.16,1,0.3,1) both,
                     shake     0.48s cubic-bezier(0.36,0.07,0.19,0.97) 0.05s both;
        }

        /* ── Icon float (step icons) ───────────────────────────────────── */
        .icon-float { animation: float 4s ease-in-out infinite }

        /* ── Logo pulse ────────────────────────────────────────────────── */
        .logo-pulse { animation: logoPulse 3s ease-in-out infinite }

        /* ── Icon color transition ─────────────────────────────────────── */
        .icon-transition { transition: color 0.18s ease }

        /* ── OTP complete pulse ────────────────────────────────────────── */
        .otp-complete { animation: otpPulse 1.5s ease-in-out infinite }

        /* ── Check appear ──────────────────────────────────────────────── */
        .check-appear { animation: popIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both }

        /* ── Success state ─────────────────────────────────────────────── */
        .success-card {
          animation: cardEntry 0.5s cubic-bezier(0.16,1,0.3,1) both;
          animation-play-state: paused;
        }
        .success-icon-wrap { animation: successBounce 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.15s both, successPulse 2s ease-in-out 0.8s infinite }

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

        /* ── Eye button ────────────────────────────────────────────────── */
        .eye-btn {
          color: rgba(148,163,184,0.6);
          transition: color 0.15s ease, transform 0.15s ease;
        }
        .eye-btn:hover {
          color: rgba(203,213,225,0.9);
          transform: scale(1.1);
        }

        /* ── Back link ─────────────────────────────────────────────────── */
        .back-btn {
          transition: color 0.15s ease;
        }
        .back-btn:hover { color: rgba(203,213,225,0.8) }
      `}</style>
    </div>
  )
}