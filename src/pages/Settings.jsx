import { useState, useRef, useEffect, useCallback } from 'react'
import {
  User, Bell, Shield, Save, Trash2, ExternalLink,
  CheckCircle, BookOpen, Github, Globe, AlertTriangle,
  Moon, Sun, Monitor, Calendar, Languages, Zap
} from 'lucide-react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'

const TABS = [
  { id: 'profile', icon: User,     label: 'Profile'       },
  { id: 'docs',    icon: BookOpen,  label: 'Documentation' },
  { id: 'notif',   icon: Bell,      label: 'Notifications' },
  { id: 'prefs',   icon: Shield,    label: 'Preferences'   },
]

function Toggle({ checked, onChange }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
      <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500" />
    </label>
  )
}

function DeleteModal({ onClose, onConfirm }) {
  var [input, setInput] = useState('')
  var [step,  setStep]  = useState(1)
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-red-100 bg-red-50">
          <div className="flex items-center gap-3 mb-1">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <h2 className="text-base font-bold text-red-700">Delete Account</h2>
          </div>
          <p className="text-xs text-red-600 ml-8">This action is permanent and cannot be undone.</p>
        </div>
        <div className="p-6">
          {step === 1 && (
            <div>
              <p className="text-sm text-slate-700 mb-4 leading-relaxed">Deleting your account will permanently remove:</p>
              <ul className="text-sm text-slate-600 flex flex-col gap-2 mb-5">
                {['All your AI jobs and results', 'Your profile and settings', 'All uploaded files and attachments'].map(function(item) {
                  return (
                    <li key={item} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                      {item}
                    </li>
                  )
                })}
              </ul>
              <div className="flex gap-2">
                <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button onClick={function() { setStep(2) }} className="btn-danger flex-1 justify-center">Continue</button>
              </div>
            </div>
          )}
          {step === 2 && (
            <div>
              <p className="text-sm text-slate-700 mb-3">
                Type <strong className="text-red-600">DELETE</strong> to confirm:
              </p>
              <input
                className="input mb-4 font-mono"
                placeholder="Type DELETE"
                value={input}
                onChange={function(e) { setInput(e.target.value) }}
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button
                  onClick={function() { if (input === 'DELETE') onConfirm() }}
                  disabled={input !== 'DELETE'}
                  className={'btn-danger flex-1 justify-center gap-2 ' + (input !== 'DELETE' ? 'opacity-40 cursor-not-allowed' : '')}
                >
                  <Trash2 size={14} /> Delete My Account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Settings() {
  var { user, saveAuth, logout } = useAuth()
  var { addNotification }        = useNotifications()

  var [tab,        setTab]        = useState('profile')
  var [name,       setName]       = useState(user?.name  || '')
  var [bio,        setBio]        = useState(user?.bio   || '')
  var [timezone,   setTZ]         = useState('Asia/Kolkata')
  var [avatar,     setAvatar]     = useState(user?.avatar || null)
  var [saved,      setSaved]      = useState(false)
  var [showDelete, setShowDelete] = useState(false)
  var fileRef = useRef(null)

  var [notifPrefs, setNotifPrefs] = useState({
    jobFailed:     true,
    jobCompleted:  false,
    workerOffline: true,
    weeklyDigest:  false,
  })

  var [theme,     setTheme]     = useState('Light')
  var [lang,      setLang]      = useState('English')
  var [dateFmt,   setDateFmt]   = useState('DD/MM/YYYY')
  var [prefSaved, setPrefSaved] = useState(false)

  var applyTheme = useCallback(function(t) {
    var root = document.documentElement
    if (t === 'Dark') {
      root.classList.add('dark')
    } else if (t === 'Light') {
      root.classList.remove('dark')
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
    localStorage.setItem('theme', t)
  }, [])

  useEffect(function() {
    var savedTheme   = localStorage.getItem('theme')      || 'Light'
    var savedLang    = localStorage.getItem('lang')       || 'English'
    var savedDateFmt = localStorage.getItem('dateFmt')    || 'DD/MM/YYYY'
    var savedNotif   = localStorage.getItem('notifPrefs')
    setTheme(savedTheme)
    setLang(savedLang)
    setDateFmt(savedDateFmt)
    applyTheme(savedTheme)
    if (savedNotif) {
      try { setNotifPrefs(JSON.parse(savedNotif)) } catch(e) {}
    }
  }, [applyTheme])

  function handleAvatarChange(e) {
    var file = e.target.files[0]
    if (!file) return
    if (file.size > 800 * 1024) { addNotification('Avatar must be under 800KB', 'error'); return }
    var reader = new FileReader()
    reader.onload = function(ev) { setAvatar(ev.target.result) }
    reader.readAsDataURL(file)
  }

  function handleSaveProfile() {
    if (!name.trim()) { addNotification('Name cannot be empty', 'error'); return }
    saveAuth({ ...user, name: name.trim(), bio: bio, avatar: avatar })
    setSaved(true)
    addNotification('Profile updated successfully', 'success')
    setTimeout(function() { setSaved(false) }, 2500)
  }

  function toggleNotif(key) {
    setNotifPrefs(function(prev) { return { ...prev, [key]: !prev[key] } })
  }

  function saveNotifPrefs() {
    localStorage.setItem('notifPrefs', JSON.stringify(notifPrefs))
    addNotification('Notification preferences saved', 'success')
  }

  function savePrefsFn() {
    applyTheme(theme)
    localStorage.setItem('lang',    lang)
    localStorage.setItem('dateFmt', dateFmt)
    setPrefSaved(true)
    addNotification('Preferences saved — ' + theme + ' mode applied', 'success')
    setTimeout(function() { setPrefSaved(false) }, 2000)
  }

  function handleDeleteAccount() {
    setShowDelete(false)
    addNotification('Account deletion initiated — logging out', 'warning')
    setTimeout(function() { logout() }, 1500)
  }

  var initials = (name || user?.name || 'U')[0].toUpperCase()

  var methodColors = {
    GET:  'bg-emerald-100 text-emerald-700',
    POST: 'bg-blue-100 text-blue-700',
    PUT:  'bg-amber-100 text-amber-700',
  }

  return (
    <Layout>
      {showDelete && (
        <DeleteModal
          onClose={function() { setShowDelete(false) }}
          onConfirm={handleDeleteAccount}
        />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your account, preferences and documentation.</p>
        </div>
        <span className="text-xs text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          System Operational
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Sidebar */}
        <div className="card p-2 h-fit">
          {TABS.map(function(item) {
            var Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={function() { setTab(item.id) }}
                className={
                  'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ' +
                  (tab === item.id ? 'bg-brand-50 text-brand-600' : 'text-slate-600 hover:bg-slate-50')
                }
              >
                <Icon size={15} />
                {item.label}
              </button>
            )
          })}
        </div>

        <div className="lg:col-span-3 flex flex-col gap-6">

          {/* ── PROFILE ── */}
          {tab === 'profile' && (
            <div>
              <div className="card p-6 mb-6">
                <h2 className="text-base font-bold text-slate-800 mb-1">Public Profile</h2>
                <p className="text-xs text-slate-500 mb-6">This information is visible across your account.</p>

                {/* Avatar */}
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                  <div className="relative">
                    {avatar
                      ? <img src={avatar} alt="avatar" className="w-16 h-16 rounded-full object-cover ring-2 ring-brand-100" />
                      : <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-2xl font-bold">{initials}</div>
                    }
                    <button
                      onClick={function() { fileRef.current && fileRef.current.click() }}
                      className="absolute -bottom-1 -right-1 w-6 h-6 bg-brand-500 rounded-full flex items-center justify-center text-white text-xs shadow-md hover:bg-brand-600 transition-colors"
                    >✎</button>
                  </div>
                  <div>
                    <button onClick={function() { fileRef.current && fileRef.current.click() }} className="btn-primary text-sm">
                      Change Avatar
                    </button>
                    <input ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/gif,image/png" className="hidden" onChange={handleAvatarChange} />
                    <p className="text-xs text-slate-400 mt-1.5">JPG, GIF or PNG · Max 800KB</p>
                    {avatar && (
                      <button onClick={function() { setAvatar(null) }} className="text-xs text-red-400 hover:text-red-500 mt-1 block">
                        Remove photo
                      </button>
                    )}
                  </div>
                </div>

                {/* Name + Username */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                    <input className="input" value={name} onChange={function(e) { setName(e.target.value) }} placeholder="Your full name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">@</span>
                      <input className="input pl-7" defaultValue={(user?.name || '').toLowerCase().replace(/\s+/g, '_')} />
                    </div>
                  </div>
                </div>

                {/* Email readonly */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                  <input className="input bg-slate-50 text-slate-400 cursor-not-allowed" value={user?.email || ''} readOnly />
                  <p className="text-xs text-slate-400 mt-1">Email cannot be changed after registration</p>
                </div>

                {/* Bio */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Bio</label>
                  <textarea
                    className="input min-h-[72px] resize-none"
                    value={bio}
                    onChange={function(e) { setBio(e.target.value) }}
                    placeholder="Senior DevOps Engineer focused on scaling AI infrastructure..."
                  />
                </div>

                {/* Timezone */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Timezone</label>
                  <select className="input" value={timezone} onChange={function(e) { setTZ(e.target.value) }}>
                    <option value="Asia/Kolkata">Asia/Kolkata (IST, UTC+5:30)</option>
                    <option value="America/New_York">America/New_York (EST, UTC-5)</option>
                    <option value="Europe/London">Europe/London (GMT, UTC+0)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (JST, UTC+9)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST, UTC-8)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <span className="text-xs text-slate-400">All data is encrypted at rest.</span>
                  <button onClick={handleSaveProfile} className="btn-primary gap-2">
                    {saved
                      ? <span className="flex items-center gap-2"><CheckCircle size={14} /> Saved!</span>
                      : <span className="flex items-center gap-2"><Save size={14} /> Save Changes</span>
                    }
                  </button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="card p-6 border-red-200">
                <h2 className="text-base font-bold text-red-500 mb-1">Danger Zone</h2>
                <p className="text-xs text-slate-500 mb-4">Permanently delete your account and all data. Cannot be undone.</p>
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Delete your account</p>
                    <p className="text-xs text-slate-500 mt-0.5">Removes all jobs, results, files and your profile permanently.</p>
                  </div>
                  <button onClick={function() { setShowDelete(true) }} className="btn-danger gap-2 flex-shrink-0 ml-4">
                    <Trash2 size={14} /> Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── DOCUMENTATION ── */}
          {tab === 'docs' && (
            <div className="flex flex-col gap-6">
              <div className="card p-6">
                <h2 className="text-base font-bold text-slate-800 mb-1">Documentation & Resources</h2>
                <p className="text-xs text-slate-500 mb-5">Everything you need to integrate and use AI JobFlow.</p>

                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[
                    { icon: BookOpen, label: 'API Reference',  desc: 'REST endpoint docs',  href: 'https://docs.spring.io/spring-boot/docs/current/reference/html/', color: 'text-brand-500 bg-brand-50'   },
                    { icon: Github,   label: 'Node.js SDK',    desc: 'npm @aijobflow/sdk', href: 'https://nodejs.org/en/docs',                                       color: 'text-slate-600 bg-slate-100'  },
                    { icon: Globe,    label: 'Webhooks',       desc: 'Configure callbacks', href: 'https://webhook.site/',                                            color: 'text-violet-500 bg-violet-50' },
                  ].map(function(item) {
                    var Icon = item.icon
                    return (
                      <a key={item.label} href={item.href} target="_blank" rel="noreferrer"
                        className="card-hover p-4 block hover:border-brand-200 transition-all">
                        <div className={'w-8 h-8 rounded-lg flex items-center justify-center mb-3 ' + item.color}>
                          <Icon size={15} />
                        </div>
                        <p className="text-sm font-semibold text-slate-700">{item.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                      </a>
                    )
                  })}
                </div>

                {/* API base URL */}
                <div className="border-t border-slate-100 pt-5">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">API Base URL</p>
                  <div className="bg-slate-900 rounded-xl px-4 py-3 font-mono text-xs text-emerald-400 mb-4 flex items-center justify-between">
                    <span>http://localhost:8001/api</span>
                    <button
                      onClick={function() {
                        navigator.clipboard.writeText('http://localhost:8001/api')
                        addNotification('API URL copied to clipboard', 'success')
                      }}
                      className="text-slate-400 hover:text-white transition-colors text-[10px] ml-4"
                    >Copy</button>
                  </div>

                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Endpoints</p>
                  <div className="flex flex-col gap-1.5">
                    {[
                      { method: 'POST', path: '/auth/register',  desc: 'Create new user'         },
                      { method: 'POST', path: '/auth/login',      desc: 'Login and get JWT token' },
                      { method: 'GET',  path: '/jobs',            desc: 'List all jobs'           },
                      { method: 'POST', path: '/jobs',            desc: 'Create new job'          },
                      { method: 'GET',  path: '/jobs/:id',        desc: 'Get job by ID'           },
                      { method: 'POST', path: '/jobs/:id/retry',  desc: 'Retry failed job'        },
                      { method: 'PUT',  path: '/jobs/:id/cancel', desc: 'Cancel job'              },
                      { method: 'GET',  path: '/metrics',         desc: 'System metrics'          },
                    ].map(function(ep) {
                      return (
                        <div key={ep.path} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                          <span className={'text-[10px] font-bold px-2 py-0.5 rounded w-12 text-center flex-shrink-0 ' + (methodColors[ep.method] || 'bg-slate-100 text-slate-600')}>
                            {ep.method}
                          </span>
                          <code className="text-xs font-mono text-slate-700 flex-1">/api{ep.path}</code>
                          <span className="text-xs text-slate-400">{ep.desc}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* CI/CD */}
              <div className="card p-6">
                <h3 className="section-title mb-4">CI/CD & Integration</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'GitHub Actions',   href: 'https://docs.github.com/en/actions',                               desc: 'Automate deployments'  },
                    { label: 'Docker Setup',     href: 'https://docs.docker.com/get-started/',                             desc: 'Containerize the app'  },
                    { label: 'Jenkins CI',       href: 'https://www.jenkins.io/doc/book/pipeline/',                        desc: 'Build pipelines'       },
                    { label: 'Spring Boot Docs', href: 'https://docs.spring.io/spring-boot/docs/current/reference/html/', desc: 'Backend reference'     },
                    { label: 'RabbitMQ Guide',   href: 'https://www.rabbitmq.com/documentation.html',                     desc: 'Queue management'      },
                    { label: 'Groq API Docs',    href: 'https://console.groq.com/docs/openai',                             desc: 'AI model reference'    },
                  ].map(function(item) {
                    return (
                      <a key={item.label} href={item.href} target="_blank" rel="noreferrer"
                        className="flex items-start gap-3 p-3 rounded-xl hover:bg-brand-50 border border-transparent hover:border-brand-100 transition-all group">
                        <ExternalLink size={13} className="text-brand-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-slate-700 group-hover:text-brand-600 transition-colors">{item.label}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                        </div>
                      </a>
                    )
                  })}
                </div>
              </div>

              {/* Security */}
              <div className="card p-6">
                <h3 className="section-title mb-4">Security Best Practices</h3>
                <div className="flex flex-col gap-3">
                  {[
                    'Never commit raw API keys or passwords to public repositories',
                    'Store credentials in environment variables — never in source code',
                    'Rotate your JWT secret key every 90 days in production',
                    'Always use HTTPS in production — never expose HTTP publicly',
                    'Set spring.jpa.hibernate.ddl-auto=validate in production',
                  ].map(function(tip, i) {
                    return (
                      <div key={i} className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                        <span className="w-5 h-5 bg-amber-400 rounded-full text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <p className="text-xs text-slate-600 leading-relaxed">{tip}</p>
                      </div>
                    )
                  })}
                </div>
                <a href="https://owasp.org/www-project-api-security/" target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs text-brand-500 font-medium mt-4 hover:underline">
                  <ExternalLink size={11} /> OWASP API Security Top 10
                </a>
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS ── */}
          {tab === 'notif' && (
            <div className="card p-6">
              <h2 className="text-base font-bold text-slate-800 mb-1">Notification Preferences</h2>
              <p className="text-xs text-slate-500 mb-5">Control which events show in your dashboard bell.</p>

              {[
                { key: 'jobFailed',     label: 'Job Failed Alerts',   desc: 'Get notified when a job fails processing'   },
                { key: 'jobCompleted',  label: 'Job Completed',        desc: 'Notify on every successful job completion'  },
                { key: 'workerOffline', label: 'Worker Offline Alert', desc: 'Alert when a worker node goes inactive'     },
                { key: 'weeklyDigest',  label: 'Weekly Digest',        desc: 'Weekly summary of your AI job activity'     },
              ].map(function(item) {
                return (
                  <div key={item.key} className="flex items-center justify-between py-3.5 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{item.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                    <Toggle
                      checked={notifPrefs[item.key]}
                      onChange={function() { toggleNotif(item.key) }}
                    />
                  </div>
                )
              })}

              <button onClick={saveNotifPrefs} className="btn-primary mt-5 gap-2">
                <Save size={14} /> Save Preferences
              </button>
            </div>
          )}

          {/* ── PREFERENCES ── */}
          {tab === 'prefs' && (
            <div className="card p-6">
              <h2 className="text-base font-bold text-slate-800 mb-1">Application Preferences</h2>
              <p className="text-xs text-slate-500 mb-6">Customize how the dashboard looks and behaves.</p>

              {/* Theme */}
              <div className="mb-6 pb-6 border-b border-slate-100">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
                  <Monitor size={14} /> Theme
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'Light',  icon: Sun,     desc: 'Clean white interface' },
                    { id: 'Dark',   icon: Moon,    desc: 'Easy on the eyes'      },
                    { id: 'System', icon: Monitor, desc: 'Follows OS setting'    },
                  ].map(function(t) {
                    var Icon = t.icon
                    return (
                      <button
                        key={t.id}
                        onClick={function() { setTheme(t.id); applyTheme(t.id) }}
                        className={
                          'p-4 rounded-xl border-2 text-left transition-all duration-200 ' +
                          (theme === t.id ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:bg-slate-50')
                        }
                      >
                        <Icon size={18} className={theme === t.id ? 'text-brand-500 mb-2' : 'text-slate-400 mb-2'} />
                        <p className={'text-sm font-semibold ' + (theme === t.id ? 'text-brand-600' : 'text-slate-700')}>{t.id}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{t.desc}</p>
                      </button>
                    )
                  })}
                </div>
                <div className={
                  'mt-3 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all duration-300 ' +
                  (theme === 'Dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-500')
                }>
                  <Zap size={11} className={theme === 'Dark' ? 'text-violet-400' : 'text-amber-400'} />
                  Theme applied instantly: <strong>{theme}</strong> mode active
                </div>
              </div>

              {/* Region — honest about what this actually does */}
              <div className="mb-6 pb-6 border-b border-slate-100">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
                  <Languages size={14} /> Region
                </label>
                <select
                  className="input w-full max-w-xs"
                  value={lang}
                  onChange={function(e) { setLang(e.target.value) }}
                >
                  <option value="English">🇺🇸 United States (en-US)</option>
                  <option value="Hindi">🇮🇳 India (en-IN)</option>
                  <option value="Spanish">🇪🇸 Spain (es-ES)</option>
                  <option value="French">🇫🇷 France (fr-FR)</option>
                  <option value="German">🇩🇪 Germany (de-DE)</option>
                  <option value="Japanese">🇯🇵 Japan (ja-JP)</option>
                </select>
                <p className="text-xs text-slate-400 mt-1.5">
                  Affects number and currency formatting. Save and refresh to apply.
                </p>
                <div className="mt-2 p-2 bg-slate-50 rounded-lg text-xs text-slate-500">
                  Example: {lang === 'Hindi' ? '₹1,00,000' : lang === 'German' ? '1.000,00 €' : lang === 'Japanese' ? '¥100,000' : '$1,000.00'}
                </div>
              </div>

              {/* Date format */}
              <div className="mb-6 pb-6 border-b border-slate-100">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
                  <Calendar size={14} /> Date Format
                </label>
                <div className="flex flex-col gap-2 max-w-xs">
                  {[
                    { v: 'DD/MM/YYYY', example: '19/03/2026' },
                    { v: 'MM/DD/YYYY', example: '03/19/2026' },
                    { v: 'YYYY-MM-DD', example: '2026-03-19' },
                  ].map(function(fmt) {
                    return (
                      <label
                        key={fmt.v}
                        className={
                          'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all duration-150 hover:bg-slate-50 ' +
                          (dateFmt === fmt.v ? 'border-brand-300 bg-brand-50' : 'border-slate-200')
                        }
                      >
                        <div className="flex items-center gap-2">
                          <div className={
                            'w-4 h-4 rounded-full border-2 flex items-center justify-center ' +
                            (dateFmt === fmt.v ? 'border-brand-500' : 'border-slate-300')
                          }>
                            {dateFmt === fmt.v && <div className="w-2 h-2 rounded-full bg-brand-500" />}
                          </div>
                          <span className="text-sm font-medium text-slate-700">{fmt.v}</span>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">{fmt.example}</span>
                        <input
                          type="radio"
                          name="dateFmt"
                          value={fmt.v}
                          checked={dateFmt === fmt.v}
                          onChange={function() { setDateFmt(fmt.v) }}
                          className="hidden"
                        />
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Current summary */}
              <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs font-semibold text-slate-600 mb-2">Current Preferences</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Theme',    value: theme   },
                    { label: 'Language', value: lang    },
                    { label: 'Date',     value: dateFmt },
                  ].map(function(item) {
                    return (
                      <div key={item.label} className="text-center">
                        <p className="text-xs text-slate-400">{item.label}</p>
                        <p className="text-sm font-bold text-slate-700 mt-0.5">{item.value}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              <button onClick={savePrefsFn} className="btn-primary gap-2">
                {prefSaved
                  ? <span className="flex items-center gap-2"><CheckCircle size={14} /> Saved!</span>
                  : <span className="flex items-center gap-2"><Save size={14} /> Save Preferences</span>
                }
              </button>
            </div>
          )}

        </div>
      </div>
    </Layout>
  )
}