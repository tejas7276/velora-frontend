import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Topbar  from './Topbar'
import { getMetrics } from '../api/metrics'

export default function Layout({ children }) {
  var [apiOk,   setApiOk]   = useState(true)
  var [mounted, setMounted] = useState(false)

  useEffect(function() {
    getMetrics()
      .then(function()  { setApiOk(true)  })
      .catch(function() { setApiOk(false) })
    var t = setTimeout(function() { setMounted(true) }, 80)
    return function() { clearTimeout(t) }
  }, [])

  return (
    <div className="bg-slate-50 min-h-screen">
      <Sidebar />
      <div className="main-content flex flex-col min-h-screen">
        <Topbar />
        <main
          className="p-6 flex-1"
          style={{
            transition: 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.16,1,0.3,1)',
            opacity:   mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(10px)',
          }}
        >
          {children}
        </main>
        <footer className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>© 2026 Velora Platform</span>
          <div className="flex items-center gap-1.5">
            <span className={
              'w-1.5 h-1.5 rounded-full inline-block transition-colors duration-500 ' +
              (apiOk ? 'bg-emerald-400' : 'bg-red-400')
            } />
            <span style={{ transition: 'color 0.3s ease' }}>
              {apiOk ? 'API: Operational' : 'API: Unreachable'}
            </span>
          </div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-slate-600 transition-colors">Documentation</a>
            <a href="#" className="hover:text-slate-600 transition-colors">Support</a>
            <a href="#" className="hover:text-slate-600 transition-colors">Terms</a>
          </div>
        </footer>
      </div>
    </div>
  )
}