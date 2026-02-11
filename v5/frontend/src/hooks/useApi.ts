/**
 * SmartLamppost v5.0 - useApi Hook
 * Wraps the api service for use in React components
 */

import { api } from '@/services/api'

export function useApi() {
  return api
}

export default useApi
