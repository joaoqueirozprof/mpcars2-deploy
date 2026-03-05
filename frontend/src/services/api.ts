import axios, { AxiosInstance, AxiosError } from 'axios'

const getApiBaseUrl = (): string => {
  const hostname = window.location.hostname
  if (hostname === '72.61.129.78' || hostname === 'localhost') {
    return `http://${hostname}:8002/api/v1`
  }
  return '/api/v1'
}

const api: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
