// Use environment variable or default to /api for same-origin requests
const API_BASE = import.meta.env.VITE_API_URL || '/api'

class ApiError extends Error {
  status: number
  error_code?: string

  constructor(message: string, status: number, error_code?: string) {
    super(message)
    this.status = status
    this.error_code = error_code
    this.name = 'ApiError'
  }
}

const getHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  }

  const token = localStorage.getItem('token')
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return headers
}

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    // Support both error_code (new) and error (legacy) formats
    const errorCode = data.error_code
    const errorMessage = data.error || errorCode || 'Erro na requisicao'
    throw new ApiError(errorMessage, response.status, errorCode)
  }

  // Handle empty responses
  const text = await response.text()
  if (!text) return {}

  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

export const api = {
  get: async (endpoint: string) => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'GET',
      headers: getHeaders()
    })
    return handleResponse(response)
  },

  post: async (endpoint: string, data?: object) => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: data ? JSON.stringify(data) : undefined
    })
    return handleResponse(response)
  },

  put: async (endpoint: string, data?: object) => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: data ? JSON.stringify(data) : undefined
    })
    return handleResponse(response)
  },

  delete: async (endpoint: string) => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders()
    })
    return handleResponse(response)
  },

  upload: async (endpoint: string, file: File, fieldName = 'file') => {
    const formData = new FormData()
    formData.append(fieldName, file)

    const headers: HeadersInit = {}
    const token = localStorage.getItem('token')
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData
    })
    return handleResponse(response)
  }
}

export { ApiError }
