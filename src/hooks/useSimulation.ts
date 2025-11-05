import { useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { SimulationService } from '@/lib/simulation-service'
import type {
  SimulationRequest,
  SimulationProgress,
  UseSimulationOptions,
  UseSimulationReturn,
} from './types'
import type { SimulationResult } from '@/lib/types'

/**
 * Custom hook for managing EVM trace simulation execution
 *
 * Handles:
 * - Simulation execution via SimulationService
 * - Loading and error states
 * - Success and error notifications
 * - Service instance caching for performance
 *
 * @param options - Optional callbacks for success and error handling
 * @returns Simulation state and control functions
 *
 * @example
 * ```tsx
 * const { simulate, result, isSimulating } = useSimulation({
 *   onSuccess: (result) => {
 *     console.log('Simulation completed:', result)
 *   },
 *   onError: (error) => {
 *     console.error('Simulation failed:', error)
 *   }
 * })
 *
 * // Execute simulation
 * await simulate({
 *   rpcUrl: 'https://eth.llamarpc.com',
 *   payload: '0x...',
 *   fromAddress: '0x...',
 *   toAddress: '0x...',
 * })
 * ```
 */
export function useSimulation(options?: UseSimulationOptions): UseSimulationReturn {
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [progress, setProgress] = useState<SimulationProgress | null>(null)
  const [error, setError] = useState<Error | null>(null)

  // Cache service instance to avoid re-creation on every simulation
  const serviceRef = useRef<SimulationService | undefined>(undefined)

  const simulate = useCallback(
    async (params: SimulationRequest) => {
      console.log('Simulating with data:', params)
      setIsSimulating(true)
      setResult(null)
      setError(null)
      setProgress(null)

      try {
        // Create or reuse service instance
        if (!serviceRef.current) {
          serviceRef.current = new SimulationService()
        }

        const simulationResult = await serviceRef.current.simulate({
          rpcUrl: params.rpcUrl,
          payload: params.payload,
          fromAddress: params.fromAddress,
          toAddress: params.toAddress,
          blockNumber: params.blockNumber,
          apiEtherscanUrl: params.apiEtherscanUrl,
          etherscanUrl: params.etherscanUrl,
          etherscanApiKey: params.etherscanApiKey,
          onProgress: (step, totalSteps, message) => {
            const progressData = { step, totalSteps, message }
            setProgress(progressData)
            options?.onProgress?.(progressData)
          },
        })

        setResult(simulationResult)

        // Show toast notification based on result
        if (simulationResult.success) {
          toast.success('Simulation Successful', {
            description: 'Transaction simulation completed successfully',
          })
        } else {
          toast.error('Simulation Failed', {
            description: simulationResult.error || 'An unknown error occurred',
          })
        }

        // Call success callback if provided
        options?.onSuccess?.(simulationResult)
      } catch (err) {
        console.error('Simulation error:', err)
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        const errorObj = err instanceof Error ? err : new Error(errorMessage)

        setError(errorObj)

        toast.error('Simulation Failed', {
          description: errorMessage,
        })

        setResult({
          success: false,
          error: errorMessage,
        })

        // Call error callback if provided
        options?.onError?.(errorObj)
      } finally {
        setIsSimulating(false)
      }
    },
    [options]
  )

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
    setIsSimulating(false)
    setProgress(null)
  }, [])

  return {
    simulate,
    result,
    isSimulating,
    progress,
    error,
    reset,
  }
}
