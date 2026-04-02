export default function StatusBadge({ status }) {
  var s = (status || '').toUpperCase()

  var map = {
    PENDING:    { cls: 'badge-pending',    dot: 'bg-slate-400',   label: 'Pending'    },
    PROCESSING: { cls: 'badge-processing', dot: 'bg-blue-500',    label: 'Processing' },
    COMPLETED:  { cls: 'badge-completed',  dot: 'bg-green-500',   label: 'Completed'  },
    FAILED:     { cls: 'badge-failed',     dot: 'bg-red-500',     label: 'Failed'     },
    CANCELLED:  { cls: 'badge-cancelled',  dot: 'bg-slate-400',   label: 'Cancelled'  },
    SCHEDULED:  { cls: 'badge-scheduled',  dot: 'bg-amber-500',   label: 'Scheduled'  },
    ACTIVE:     { cls: 'badge-active',     dot: 'bg-emerald-500', label: 'Active'     },
    INACTIVE:   { cls: 'badge-inactive',   dot: 'bg-slate-400',   label: 'Inactive'   },
  }

  var cfg = map[s] || { cls: 'badge bg-slate-100 text-slate-600', dot: 'bg-slate-400', label: status }

  return (
    <span className={cfg.cls + ' inline-flex items-center gap-1.5'}>
      <span className={
        'w-1.5 h-1.5 rounded-full flex-shrink-0 ' + cfg.dot +
        (s === 'PROCESSING' ? ' animate-pulse' : '')
      } />
      {cfg.label}
    </span>
  )
}