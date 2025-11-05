import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { PrivateBinShareClient } from '@/lib/privatebin-client'
import type { SimulationResult } from '@/lib/types'
import type {
  LoadedSharedData,
  UseLoadSharedTransactionOptions,
  UseLoadSharedTransactionReturn,
} from './types'

/**
 * Custom hook for loading shared transaction data from URL parameters
 *
 * Handles:
 * - Reading share URL from browser URL parameters
 * - Fetching encrypted data from PrivateBin
 * - Decrypting transaction data
 * - Loading states during fetch/decrypt
 * - Success and error notifications
 * - Returns both transaction data and simulation results (if available)
 *
 * @param options - Optional callbacks for success and error handling
 * @returns Loading state, loaded data, and error information
 *
 * @example
 * ```tsx
 * const { isLoading, data, error } = useLoadSharedTransaction({
 *   onSuccess: (data) => {
 *     // Auto-populate form with loaded data
 *     setValue('payload', data.payload)
 *     setValue('fromAddress', data.fromAddress)
 *     setValue('toAddress', data.toAddress)
 *   },
 *   onError: (error) => {
 *     console.error('Failed to load shared data:', error)
 *   }
 * })
 * ```
 */
export function useLoadSharedTransaction(
  options?: UseLoadSharedTransactionOptions
): UseLoadSharedTransactionReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<LoadedSharedData | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null)

  // Use ref to ensure effect only runs once
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    // Prevent double execution in StrictMode
    if (hasLoadedRef.current) {
      return
    }

    const loadFromPrivateBin = async () => {
      const privatebinClient = new PrivateBinShareClient()
      const shareUrl = privatebinClient.getShareUrlFromParams()

      if (!shareUrl) {
        return
      }

      hasLoadedRef.current = true
      setIsLoading(true)
      setError(null)

      try {
        toast.info('Loading shared transaction data...')
        const fetchedData = await privatebinClient.fetchPaste(shareUrl)

        // Extract transaction data
        const loadedData: LoadedSharedData = {
          payload: fetchedData.payload,
          fromAddress: fetchedData.fromAddress,
          toAddress: fetchedData.toAddress,
          blockNumber: fetchedData.blockNumber,
          apiEtherscanUrl: fetchedData.apiEtherscanUrl,
          etherscanUrl: fetchedData.etherscanUrl,
          // Note: etherscanApiKey is not shared for security reasons
        }

        setData(loadedData)

        // Restore simulation result if available
        if (fetchedData.simulationResult) {
          const restoredResult: SimulationResult = {
            success: fetchedData.simulationResult.success,
            trace: fetchedData.simulationResult.trace,
            parsedTrace: fetchedData.simulationResult.parsedTrace,
            contractNames: fetchedData.simulationResult.contractNames
              ? new Map(Object.entries(fetchedData.simulationResult.contractNames))
              : undefined,
            chainId: fetchedData.simulationResult.chainId,
            etherscanUrl: fetchedData.simulationResult.etherscanUrl,
            error: fetchedData.simulationResult.error,
            errorDetails: fetchedData.simulationResult.errorDetails,
          }
          setSimulationResult(restoredResult)

          const resultMsg = restoredResult.success
            ? 'Transaction data and simulation results loaded!'
            : 'Transaction data loaded (simulation failed)'

          toast.success(resultMsg)
        } else {
          toast.success('Transaction data loaded successfully')
        }

        // Call success callback if provided
        options?.onSuccess?.(loadedData)
      } catch (err) {
        console.error('Failed to load from PrivateBin:', err)
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        const errorObj = err instanceof Error ? err : new Error(errorMessage)

        setError(errorObj)

        toast.error('Failed to load shared data', {
          description: errorMessage,
        })

        // Call error callback if provided
        options?.onError?.(errorObj)
      } finally {
        setIsLoading(false)
      }
    }

    loadFromPrivateBin()
  }, [options])

  return {
    isLoading,
    data,
    simulationResult,
    error,
  }
}
