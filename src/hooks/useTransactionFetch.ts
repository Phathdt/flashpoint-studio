import { useState, useCallback, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { TransactionFetcher } from '@/lib/transaction-fetcher'
import type {
  FetchedTransactionData,
  UseTransactionFetchOptions,
  UseTransactionFetchReturn,
} from './types'

/**
 * Hook for fetching transaction details from the blockchain
 */
export function useTransactionFetch(
  options?: UseTransactionFetchOptions
): UseTransactionFetchReturn {
  const [data, setData] = useState<FetchedTransactionData | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use ref to store callbacks to avoid recreating fetchTransaction
  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setIsFetching(false)
  }, [])

  const fetchTransaction = useCallback(async (rpcUrl: string, txHash: string) => {
    // Reset previous state
    setError(null)
    setIsFetching(true)

    try {
      // Validate inputs
      if (!rpcUrl) {
        throw new Error('RPC URL is required')
      }
      if (!txHash) {
        throw new Error('Transaction hash is required')
      }

      // Create fetcher instance
      const fetcher = new TransactionFetcher(rpcUrl)

      // Fetch with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
      })

      const fetchPromise = fetcher.fetchTransaction(txHash)
      const result = await Promise.race([fetchPromise, timeoutPromise])

      // Set data
      setData(result)
      setError(null)

      // Show success toast
      toast.success('Transaction Fetched', {
        description: `Successfully fetched details for ${txHash.slice(0, 10)}...`,
      })

      // Call success callback
      optionsRef.current?.onSuccess?.(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch transaction'

      setError(errorMessage)
      setData(null)

      // Show error toast
      toast.error('Fetch Failed', {
        description: errorMessage,
      })

      // Call error callback
      optionsRef.current?.onError?.(err instanceof Error ? err : new Error(errorMessage))
    } finally {
      setIsFetching(false)
    }
  }, [])

  return {
    fetchTransaction,
    data,
    isFetching,
    error,
    reset,
  }
}
