import { useState, useEffect } from 'react'

const STORAGE_KEY = 'api-rate-limit'
const DEFAULT_RATE_LIMIT = 2
const MIN_RATE_LIMIT = 2
const MAX_RATE_LIMIT = 20

/**
 * Hook to manage API rate limit preference
 * Persists the rate limit in localStorage
 */
export function useApiRateLimit() {
  const [rateLimit, setRateLimit] = useState<number>(DEFAULT_RATE_LIMIT)

  // Load rate limit from localStorage on mount
  useEffect(() => {
    try {
      const savedRateLimit = localStorage.getItem(STORAGE_KEY)
      if (savedRateLimit) {
        const parsed = parseInt(savedRateLimit, 10)
        if (!isNaN(parsed) && parsed >= MIN_RATE_LIMIT && parsed <= MAX_RATE_LIMIT) {
          setRateLimit(parsed)
        }
      }
    } catch (error) {
      console.warn('Failed to load API rate limit from localStorage:', error)
    }
  }, [])

  // Update rate limit and persist to localStorage
  const updateRateLimit = (newRateLimit: number) => {
    try {
      const validRateLimit = Math.min(Math.max(newRateLimit, MIN_RATE_LIMIT), MAX_RATE_LIMIT)
      setRateLimit(validRateLimit)
      localStorage.setItem(STORAGE_KEY, validRateLimit.toString())
    } catch (error) {
      console.warn('Failed to save API rate limit to localStorage:', error)
    }
  }

  return {
    rateLimit,
    updateRateLimit,
  }
}
