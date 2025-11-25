import { useEffect, useRef, useCallback } from 'react'
import { useTransactionFetch } from './useTransactionFetch'
import { TransactionFetcher } from '@/lib/transaction-fetcher'
import type { UseTransactionAutoFetchOptions } from './types'

export function useTransactionAutoFetch({
  enabled,
  rpcUrl,
  txHash,
  debounceMs = 500,
  onSuccess,
  onError,
}: UseTransactionAutoFetchOptions) {
  const { fetchTransaction, ...fetchState } = useTransactionFetch({
    onSuccess,
    onError,
  })

  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const fetchTransactionRef = useRef(fetchTransaction)

  // Keep ref updated with latest fetchTransaction
  useEffect(() => {
    fetchTransactionRef.current = fetchTransaction
  }, [fetchTransaction])

  // Stable fetch function that doesn't change
  const stableFetch = useCallback((rpcUrl: string, txHash: string) => {
    fetchTransactionRef.current(rpcUrl, txHash)
  }, [])

  useEffect(() => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Check if we should fetch
    if (!enabled || !rpcUrl || !txHash) {
      return
    }

    // Validate hash format
    if (!TransactionFetcher.isValidTransactionHash(txHash)) {
      return
    }

    // Debounce the fetch
    timeoutRef.current = setTimeout(() => {
      stableFetch(rpcUrl, txHash)
    }, debounceMs)

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [enabled, rpcUrl, txHash, debounceMs, stableFetch])

  return fetchState
}
