import axios from 'axios'

var BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://velora-backend-7qjl.onrender.com/api'

// ── COLD START STATE ────────────────────────────────────────────────────────
// Render free tier spins down after 15 min inactivity.
// When the first request hits a cold server, it takes 30–45s to wake up.
// We track wake-up state so the UI can show a friendly warming message
// instead of "Backend not reachable" which makes users think it's broken.
var _serverAwake      = true         // assume awake on first load
var _wakeUpStartTime  = null         // timestamp when we detected cold start
var _onWakeUpChange   = null         // callback: (isWakingUp, secondsElapsed) => void

export function setWakeUpHandler(fn) { _onWakeUpChange = fn }

// ── WAKE-UP PING ─────────────────────────────────────────────────────────────
// When we detect a network failure, ping /actuator/health to check if
// the server is waking up. This gives the user live feedback.
function pingUntilAwake() {
  if (!_wakeUpStartTime) {
    _wakeUpStartTime = Date.now()
    _serverAwake = false
    if (_onWakeUpChange) _onWakeUpChange(true, 0)
  }

  // Use a short-timeout ping instance to avoid blocking the main api instance
  var pinger = axios.create({ baseURL: BASE_URL, timeout: 5000 })
  var attempt = 0
  var MAX_ATTEMPTS = 20  // 20 * 3s = 60 seconds max wait

  function tryPing() {
    attempt++
    pinger.get('/actuator/health')
      .then(function() {
        // Server responded — it's awake
        _serverAwake = true
        var elapsed = Math.round((Date.now() - _wakeUpStartTime) / 1000)
        _wakeUpStartTime = null
        if (_onWakeUpChange) _onWakeUpChange(false, elapsed)
      })
      .catch(function() {
        if (attempt < MAX_ATTEMPTS) {
          var elapsed = Math.round((Date.now() - _wakeUpStartTime) / 1000)
          if (_onWakeUpChange) _onWakeUpChange(true, elapsed)
          setTimeout(tryPing, 3000)  // retry every 3 seconds
        } else {
          // Gave up — server not responding after 60s
          _serverAwake = true  // reset flag so normal errors show
          _wakeUpStartTime = null
          if (_onWakeUpChange) _onWakeUpChange(false, 60)
        }
      })
  }

  tryPing()
}

var api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,   // 60s — enough for Render cold start (typically 30–45s)
})

function getFriendlyMessage(err) {
  var status  = err.response ? err.response.status : null
  var message = err.response?.data?.message || ''

  // ── COLD START DETECTION ─────────────────────────────────────────────────
  // Network error (status=null) AND server not known to be awake
  // = likely Render cold start, not a real infrastructure failure
  if (!status) {
    if (!_serverAwake || _wakeUpStartTime) {
      return {
        msg: 'Server is waking up — this takes 30–45 seconds on first use. Please wait…',
        type: 'warning'
      }
    }
    return {
      msg: 'Backend not reachable — check connection or try again.',
      type: 'error'
    }
  }

  switch (status) {
    case 400:
      if (message.toLowerCase().includes('payload')) {
        return { msg: 'Add input text or upload a file before submitting.', type: 'warning' }
      }
      return { msg: message || 'Invalid request — check your input.', type: 'warning' }
    case 401:
      return { msg: 'Session expired — please login again.', type: 'error' }
    case 403:
      return { msg: 'Access denied — you don\'t have permission.', type: 'error' }
    case 404:
      return { msg: 'Data not found — it may have been removed.', type: 'error' }
    case 409:
      return { msg: 'Account already exists — try logging in.', type: 'warning' }
    case 422:
      return { msg: 'Invalid data — please fix highlighted fields.', type: 'warning' }
    case 429:
      return { msg: 'Too many requests — slow down a bit 😅', type: 'warning' }
    case 500:
      if (message.toLowerCase().includes('openai') || message.toLowerCase().includes('groq')) {
        return { msg: 'AI service failed — retry in a few seconds.', type: 'error' }
      }
      if (message.toLowerCase().includes('rabbitmq')) {
        return { msg: 'Queue service down — check backend worker.', type: 'error' }
      }
      return { msg: 'Server crashed — check backend logs.', type: 'error' }
    case 503:
      return { msg: 'Service temporarily down — try again shortly.', type: 'error' }
    default:
      return { msg: message || 'Unexpected error occurred.', type: 'error' }
  }
}

var _showToast = null

export function setToastHandler(fn) { _showToast = fn }

// ── REQUEST INTERCEPTOR ───────────────────────────────────────────────────────
api.interceptors.request.use(function(config) {
  var token  = localStorage.getItem('token')
  var userId = localStorage.getItem('userId')
  if (token)  config.headers['Authorization'] = 'Bearer ' + token
  if (userId) config.headers['X-User-Id']     = userId
  return config
})

// ── RESPONSE INTERCEPTOR ─────────────────────────────────────────────────────
api.interceptors.response.use(
  function(res) {
    // Successful response = server is awake
    if (!_serverAwake) {
      _serverAwake = true
      _wakeUpStartTime = null
      if (_onWakeUpChange) _onWakeUpChange(false, 0)
    }
    return res
  },
  function(err) {
    var status = err.response ? err.response.status : null
    var url    = err.config   ? err.config.url      : ''

    // ── COLD START DETECTION ─────────────────────────────────────────────────
    // Network error (no HTTP response) = either cold start or real network failure.
    // If the server was previously awake (we got 200s before), it's a cold start.
    // Start the wake-up ping to track recovery and notify the UI.
    if (!status && !_wakeUpStartTime) {
      pingUntilAwake()
    }

    // ── 401 HANDLING ─────────────────────────────────────────────────────────
    if (status === 401) {
      var isAuthRoute = url.includes('/auth/login') || url.includes('/auth/register')
      var isBackgroundPoll = (
        url.includes('/workers')  ||
        url.includes('/metrics')  ||
        (url.includes('/jobs') && err.config && err.config.method === 'get')
      )

      if (!isAuthRoute && !isBackgroundPoll) {
        var token = localStorage.getItem('token')
        if (!token) {
          window.location.href = '/login'
          return Promise.reject(err)
        }
        if (_showToast) {
          _showToast('Authentication failed — please try again.', 'error')
        }
        return Promise.reject(err)
      }
    }

    // Skip toast for background polling endpoints
    var isBackgroundPoll = (
      url.includes('/workers')  ||
      url.includes('/metrics')  ||
      (url.includes('/jobs') && err.config && err.config.method === 'get')
    )

    if (_showToast && !isBackgroundPoll) {
      var toast = getFriendlyMessage(err)
      _showToast(toast.msg, toast.type)
    }

    return Promise.reject(err)
  }
)

export default api