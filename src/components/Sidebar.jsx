import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, PlusCircle, ListTodo, Cpu,
  BarChart2, Settings, LogOut, Zap,
} from 'lucide-react'

const nav = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard'       },
  { to: '/create-job', icon: PlusCircle,       label: 'Create Job'      },
  { to: '/jobs',       icon: ListTodo,          label: 'Jobs Monitoring' },
  { to: '/workers',    icon: Cpu,               label: 'Workers'         },
  { to: '/metrics',    icon: BarChart2,          label: 'System Metrics'  },
  { to: '/settings',   icon: Settings,           label: 'Settings'        },
]

export default function Sidebar() {
  var { logout }      = useAuth()
  var navigate        = useNavigate()
  var [mounted, setMounted] = useState(false)

  useEffect(function() {
    var t = setTimeout(function() { setMounted(true) }, 100)
    return function() { clearTimeout(t) }
  }, [])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <aside className="sidebar" style={{
      transition: 'transform 0.5s cubic-bezier(0.16,1,0.3,1)',
      transform: mounted ? 'translateX(0)' : 'translateX(-100%)',
    }}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-slate-100">
        <div
          className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ boxShadow: '0 4px 12px rgba(59,63,228,0.35)' }}
        >
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-slate-900 text-base tracking-tight">Velora</span>
      </div>

      {/* Nav */}
      <div className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest px-2 mb-2">
          Main Menu
        </p>
        {nav.map(function(item, idx) {
          var Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              style={{
                animation: mounted
                  ? 'fadeInUp 0.4s cubic-bezier(0.16,1,0.3,1) ' + (idx * 0.05) + 's both'
                  : 'none',
              }}
              className={function(p) { return 'nav-item ' + (p.isActive ? 'active' : '') }}
            >
              <Icon />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </div>

      {/* Logout — removed Engine Health (was showing fake 0/0 data) */}
      <div className="px-3 py-3 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="nav-item w-full text-slate-400 hover:text-red-500 hover:bg-red-50"
        >
          <LogOut />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}