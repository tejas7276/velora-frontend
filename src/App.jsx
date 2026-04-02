import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider, useNotifications } from './context/NotificationContext'
import { setToastHandler } from './api/axios'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import ProtectedRoute from './components/ProtectedRoute'

import Login          from './pages/Login'
import Register       from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Dashboard      from './pages/Dashboard'
import CreateJob      from './pages/CreateJob'
import JobsMonitoring from './pages/JobsMonitoring'
import JobDetails     from './pages/JobDetails'
import Workers        from './pages/Workers'
import SystemMetrics  from './pages/SystemMetrics'
import Settings       from './pages/Settings'

// ── Page title ────────────────────────────────────────────────────────────────
const TITLES = {
  '/dashboard':  'Dashboard',
  '/create-job': 'Create Job',
  '/jobs':       'Jobs Monitoring',
  '/workers':    'Workers',
  '/metrics':    'System Metrics',
  '/settings':   'Settings',
  '/login':      'Login',
  '/register':   'Register',
}

function PageTitleUpdater() {
  var location = useLocation()
  useEffect(function() {
    var base = '/' + location.pathname.split('/')[1]
    var name = TITLES[base] || 'Velora'
    document.title = name + ' — Velora'
  }, [location.pathname])
  return null
}

// ── Toast ─────────────────────────────────────────────────────────────────────
var TOAST_ICON = {
  success: CheckCircle,
  error:   XCircle,
  warning: AlertTriangle,
  info:    Info,
}
var TOAST_BORDER = {
  success: 'border-l-4 border-emerald-500',
  error:   'border-l-4 border-red-500',
  warning: 'border-l-4 border-amber-400',
  info:    'border-l-4 border-blue-500',
}
var TOAST_COLOR = {
  success: 'text-emerald-500',
  error:   'text-red-500',
  warning: 'text-amber-400',
  info:    'text-blue-500',
}

function ToastItem({ toast, onRemove }) {
  var [visible, setVisible] = useState(false)
  useEffect(function() {
    var t1 = setTimeout(function() { setVisible(true) }, 10)
    var t2 = setTimeout(function() {
      setVisible(false)
      setTimeout(function() { onRemove(toast.id) }, 300)
    }, 4500)
    return function() { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  var type    = toast.type || 'info'
  var Icon    = TOAST_ICON[type]   || Info
  var border  = TOAST_BORDER[type] || TOAST_BORDER.info
  var color   = TOAST_COLOR[type]  || TOAST_COLOR.info

  return (
    <div
      style={{ transition: 'all 0.3s ease' }}
      className={
        'flex items-start gap-3 p-4 bg-white rounded-xl shadow-lg ' +
        'min-w-[300px] max-w-[400px] ' + border + ' ' +
        (visible ? 'opacity-100' : 'opacity-0')
      }
    >
      <Icon className={'w-5 h-5 flex-shrink-0 mt-0.5 ' + color} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 capitalize">{type}</p>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{toast.msg}</p>
      </div>
      <button
        onClick={function() { setVisible(false); setTimeout(function() { onRemove(toast.id) }, 300) }}
        className="text-slate-300 hover:text-slate-500 flex-shrink-0 mt-0.5"
      >
        <X size={14} />
      </button>
    </div>
  )
}

function ToastContainer({ toasts, onRemove }) {
  if (!toasts || toasts.length === 0) return null
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3">
      {toasts.slice(0, 5).map(function(t) {
        return <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      })}
    </div>
  )
}

// ── App Routes ────────────────────────────────────────────────────────────────
function AppRoutes() {
  var notif = useNotifications()

  useEffect(function() {
    setToastHandler(notif.addToast)
  }, [notif.addToast])

  return (
    <>
      <PageTitleUpdater />
      <Routes>
        <Route path="/login"      element={<Login />} />
        <Route path="/register"         element={<Register />} />
        <Route path="/forgot-password"   element={<ForgotPassword />} />
        <Route path="/dashboard"  element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/create-job" element={<ProtectedRoute><CreateJob /></ProtectedRoute>} />
        <Route path="/jobs"       element={<ProtectedRoute><JobsMonitoring /></ProtectedRoute>} />
        <Route path="/jobs/:id"   element={<ProtectedRoute><JobDetails /></ProtectedRoute>} />
        <Route path="/workers"    element={<ProtectedRoute><Workers /></ProtectedRoute>} />
        <Route path="/metrics"    element={<ProtectedRoute><SystemMetrics /></ProtectedRoute>} />
        <Route path="/settings"   element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="*"           element={<Navigate to="/register" replace />} />
      </Routes>
      <ToastContainer toasts={notif.toasts} onRemove={notif.removeToast} />
    </>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  )
}