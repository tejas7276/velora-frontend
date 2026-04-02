import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

const ICONS = {
  success: CheckCircle,
  error:   XCircle,
  warning: AlertTriangle,
  info:    Info,
}

const STYLES = {
  success: 'bg-white border-l-4 border-emerald-500',
  error:   'bg-white border-l-4 border-red-500',
  warning: 'bg-white border-l-4 border-amber-400',
  info:    'bg-white border-l-4 border-brand-500',
}

const ICON_COLORS = {
  success: 'text-emerald-500',
  error:   'text-red-500',
  warning: 'text-amber-400',
  info:    'text-brand-500',
}

function ToastItem({ toast, onRemove }) {
  const [visible, setVisible] = useState(false)

  useEffect(function() {
    // Animate in
    var showTimer = setTimeout(function() { setVisible(true) }, 10)
    // Auto remove after 4 seconds
    var hideTimer = setTimeout(function() {
      setVisible(false)
      setTimeout(function() { onRemove(toast.id) }, 300)
    }, 4000)
    return function() {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
    }
  }, [toast.id])

  var type    = toast.type || 'info'
  var Icon    = ICONS[type]  || Info
  var style   = STYLES[type] || STYLES.info
  var iconClr = ICON_COLORS[type] || ICON_COLORS.info

  return (
    <div
      className={
        'flex items-start gap-3 p-4 rounded-xl shadow-lg min-w-[300px] max-w-[420px] transition-all duration-300 ' +
        style +
        (visible ? ' opacity-100 translate-y-0' : ' opacity-0 translate-y-2')
      }
    >
      <Icon className={'w-5 h-5 flex-shrink-0 mt-0.5 ' + iconClr} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 capitalize">{type}</p>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{toast.msg}</p>
      </div>
      <button
        onClick={function() {
          setVisible(false)
          setTimeout(function() { onRemove(toast.id) }, 300)
        }}
        className="text-slate-300 hover:text-slate-500 flex-shrink-0 mt-0.5"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export default function ToastContainer({ toasts, onRemove }) {
  if (!toasts || toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3">
      {toasts.slice(0, 5).map(function(toast) {
        return (
          <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
        )
      })}
    </div>
  )
}