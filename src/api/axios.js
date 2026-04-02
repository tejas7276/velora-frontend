import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

function getFriendlyMessage(err) {
  var status  = err.response ? err.response.status : null
  var message = err.response?.data?.message || ''

  if (!status) {
    return {
      msg: 'Backend not reachable — start server or check connection.',
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
      return { msg: 'Access denied — you don’t have permission.', type: 'error' }

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

export function setToastHandler(fn) {
  _showToast = fn
}

api.interceptors.request.use(function(config) {
  var token  = localStorage.getItem('token')
  var userId = localStorage.getItem('userId')
  if (token)  config.headers['Authorization'] = 'Bearer ' + token
  if (userId) config.headers['X-User-Id']     = userId
  return config
})

api.interceptors.response.use(
  function(res) { return res },
  function(err) {
    var status = err.response ? err.response.status : null
    var url    = err.config   ? err.config.url      : ''

    // 401 on protected routes — log out and redirect
    if (status === 401) {
      var isAuthRoute = url.includes('/auth/login') || url.includes('/auth/register')
      if (!isAuthRoute) {
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(err)
      }
    }

    // FIX — skip toast for background polling endpoints
    // These fire automatically every few seconds — user didn't trigger them
    // showing toasts for these would spam the UI constantly
    var isBackgroundPoll = (
      url.includes('/workers')  ||
      url.includes('/metrics')  ||
      url.includes('/api/jobs') && err.config && err.config.method === 'get'
    )

    if (_showToast && !isBackgroundPoll) {
      var toast = getFriendlyMessage(err)
      _showToast(toast.msg, toast.type)
    }

    return Promise.reject(err)
  }
)

export default api