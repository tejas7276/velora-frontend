import { useState, useEffect } from 'react'

// Animated number counter
function AnimatedNumber({ value }) {
  var [display, setDisplay] = useState(0)
  var numVal = typeof value === 'number' ? value : parseInt(value) || 0

  useEffect(function() {
    if (isNaN(numVal)) return
    var start    = 0
    var duration = 800
    var startTime = null

    function step(timestamp) {
      if (!startTime) startTime = timestamp
      var progress = Math.min((timestamp - startTime) / duration, 1)
      // Ease out cubic
      var eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.floor(eased * numVal))
      if (progress < 1) requestAnimationFrame(step)
      else setDisplay(numVal)
    }
    requestAnimationFrame(step)
  }, [numVal])

  if (typeof value === 'string' && isNaN(parseInt(value))) return <span>{value}</span>
  return <span>{display.toLocaleString()}</span>
}

export default function StatCard({ icon: Icon, label, value, iconBg, iconColor, trend }) {
  var [visible, setVisible] = useState(false)

  useEffect(function() {
    var t = setTimeout(function() { setVisible(true) }, 50)
    return function() { clearTimeout(t) }
  }, [])

  return (
    <div
      className="card p-5 flex flex-col gap-3 card-lift"
      style={{
        transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
        opacity:   visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className={'w-10 h-10 rounded-xl flex items-center justify-center ' + (iconBg || 'bg-brand-50')}
          style={{ transition: 'transform 0.2s ease' }}
          onMouseEnter={function(e) { e.currentTarget.style.transform = 'scale(1.1) rotate(-5deg)' }}
          onMouseLeave={function(e) { e.currentTarget.style.transform = 'scale(1) rotate(0)' }}
        >
          {Icon && <Icon className={'w-5 h-5 ' + (iconColor || 'text-brand-500')} />}
        </div>
        {trend !== null && trend !== undefined && (
          <span className={'text-xs font-semibold px-2 py-0.5 rounded-full ' +
            (trend > 0 ? 'bg-green-100 text-green-600' : trend < 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500')
          }>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 stat-number">
          {value !== undefined && value !== null ? <AnimatedNumber value={value} /> : '—'}
        </p>
        <p className="text-xs text-slate-500 mt-0.5 font-medium">{label}</p>
      </div>
    </div>
  )
}