import { useState, useEffect } from 'react'
import type { ApiExecutionStrategy } from '@/lib/types'

const STORAGE_KEY = 'api-execution-strategy'
const DEFAULT_STRATEGY: ApiExecutionStrategy = 'parallel'

/**
 * Hook to manage API execution strategy preference
 * Persists the strategy in localStorage
 */
export function useApiExecutionStrategy() {
  const [strategy, setStrategy] = useState<ApiExecutionStrategy>(DEFAULT_STRATEGY)

  // Load strategy from localStorage on mount
  useEffect(() => {
    try {
      const savedStrategy = localStorage.getItem(STORAGE_KEY) as ApiExecutionStrategy | null
      if (savedStrategy && (savedStrategy === 'parallel' || savedStrategy === 'sequential')) {
        setStrategy(savedStrategy)
      }
    } catch (error) {
      console.warn('Failed to load API execution strategy from localStorage:', error)
    }
  }, [])

  // Update strategy and persist to localStorage
  const updateStrategy = (newStrategy: ApiExecutionStrategy) => {
    try {
      setStrategy(newStrategy)
      localStorage.setItem(STORAGE_KEY, newStrategy)
    } catch (error) {
      console.warn('Failed to save API execution strategy to localStorage:', error)
    }
  }

  return {
    strategy,
    updateStrategy,
  }
}
