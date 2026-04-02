export default function ProgressBar({ status }) {
  var config = {
    PENDING:    { pct: 10, color: 'bg-slate-300',   glow: false },
    SCHEDULED:  { pct: 5,  color: 'bg-amber-400',   glow: false },
    PROCESSING: { pct: 60, color: 'bg-blue-500',    glow: true  },
    COMPLETED:  { pct: 100,color: 'bg-emerald-500', glow: false },
    FAILED:     { pct: 100,color: 'bg-red-400',     glow: false },
    CANCELLED:  { pct: 100,color: 'bg-slate-300',   glow: false },
  }
  var cfg = config[(status || '').toUpperCase()] || config.PENDING

  return (
    <div className="flex items-center gap-2">
      <div className="progress-bar flex-1">
        <div
          className={'progress-fill ' + cfg.color}
          style={{
            width: cfg.pct + '%',
            boxShadow: cfg.glow ? '0 0 6px rgba(59,130,246,0.5)' : 'none',
            transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
          }}
        />
      </div>
      <span className="text-xs text-slate-400 flex-shrink-0 w-8 text-right">{cfg.pct}%</span>
      {cfg.glow && <span className="text-blue-400 text-xs">—</span>}
    </div>
  )
}