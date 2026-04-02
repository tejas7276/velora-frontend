import api from './axios'

export const getAllWorkers = () => api.get('/workers')
export const registerWorker = (name) => api.post(`/workers/register?name=${name}`)
export const sendHeartbeat = (data) => api.post('/workers/heartbeat', data)
