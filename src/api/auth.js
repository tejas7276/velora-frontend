import api from './axios'

const API = axios.create({
  baseURL: "https://velora-backend-7qjl.onrender.com/api",
});

export const login = (data) => api.post('/auth/login', data)
export const register = (data) => api.post('/auth/register', data)
