import api from './axios'

export const getAllJobs = (status) => {
  const params = status && status !== 'All' ? { status } : {}
  return api.get('/jobs', { params })
}
export const getUserJobs  = (userId) => api.get(`/jobs/user/${userId}`)
export const getJobById   = (id)     => api.get(`/jobs/${id}`)
export const retryJob     = (id)     => api.post(`/jobs/${id}/retry`)
export const cancelJob    = (id)     => api.put(`/jobs/${id}/cancel`)

export const createJob = (formData) =>
  api.post('/jobs', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })