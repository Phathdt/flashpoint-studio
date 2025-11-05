import { useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { PrivateBinShareClient } from '@/lib/privatebin-client'
import type { ShareData, UseShareTransactionOptions, UseShareTransactionReturn } from './types'

/**
 * Custom hook for managing transaction sharing via PrivateBin
 *
 * Handles:
 * - Creating encrypted share links
 * - Generating shareable URLs
 * - Loading states during encryption
 * - Success and error notifications
 * - Client instance caching for performance
 *
 * @param options - Optional callbacks for success and error handling
 * @returns Share state and control functions
 *
 * @example
 * ```tsx
 * const { share, isSharing, shareUrl, privateBinUrl } = useShareTransaction({
 *   onSuccess: (shareUrl, privateBinUrl) => {
 *     console.log('Share link created:', shareUrl)
 *   },
 *   onError: (error) => {
 *     console.error('Share failed:', error)
 *   }
 * })
 *
 * // Create share link
 * await share({
 *   payload: '0x...',
 *   fromAddress: '0x...',
 *   toAddress: '0x...',
 *   result: simulationResult,
 * })
 * ```
 */
export function useShareTransaction(
  options?: UseShareTransactionOptions
): UseShareTransactionReturn {
  const [isSharing, setIsSharing] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [privateBinUrl, setPrivateBinUrl] = useState('')
  const [error, setError] = useState<Error | null>(null)

  // Cache client instance to avoid re-creation
  const clientRef = useRef<PrivateBinShareClient | undefined>(undefined)

  const share = useCallback(
    async (data: ShareData) => {
      // Validate required fields
      if (!data.payload || !data.fromAddress || !data.toAddress) {
        const validationError = new Error(
          'Missing required fields: payload, fromAddress, and toAddress are required'
        )
        setError(validationError)
        toast.error('Missing required fields', {
          description: 'Please fill in payload, from address, and to address before sharing',
        })
        options?.onError?.(validationError)
        return
      }

      setIsSharing(true)
      setError(null)

      try {
        // Create or reuse client instance
        if (!clientRef.current) {
          clientRef.current = new PrivateBinShareClient()
        }

        // Prepare simulation result data (if available)
        let simulationResultData
        if (data.result) {
          simulationResultData = {
            success: data.result.success,
            trace: data.result.trace,
            parsedTrace: data.result.parsedTrace,
            contractNames: data.result.contractNames
              ? Object.fromEntries(data.result.contractNames)
              : undefined,
            chainId: data.result.chainId,
            etherscanUrl: data.result.etherscanUrl,
            allTransfers: data.result.allTransfers,
            tokenMetadata: data.result.tokenMetadata
              ? Object.fromEntries(data.result.tokenMetadata)
              : undefined,
            error: data.result.error,
            errorDetails: data.result.errorDetails,
          }
        }

        const privatebinResponse = await clientRef.current.createPaste({
          payload: data.payload,
          fromAddress: data.fromAddress,
          toAddress: data.toAddress,
          blockNumber: data.blockNumber,
          apiEtherscanUrl: data.apiEtherscanUrl, // Public URL - safe to share
          etherscanUrl: data.etherscanUrl, // Public URL - safe to share
          simulationResult: simulationResultData,
          // Security: rpcUrl and etherscanApiKey are intentionally excluded (contain sensitive API keys)
          // chainId in simulationResult is used to identify the network instead
        })

        // Generate both URLs
        const url = clientRef.current.generateShareableUrl(privatebinResponse.url)
        const pbUrl = clientRef.current.getPrivateBinUrl(privatebinResponse.url)

        setShareUrl(url)
        setPrivateBinUrl(pbUrl)

        const description = data.result
          ? 'Link includes transaction data and simulation results'
          : 'Link includes transaction data (simulate first to include results)'

        toast.success('Share link created!', {
          description,
        })

        // Call success callback if provided
        options?.onSuccess?.(url, pbUrl)
      } catch (err) {
        console.error('Share error:', err)
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        const errorObj = err instanceof Error ? err : new Error(errorMessage)

        setError(errorObj)

        toast.error('Failed to create share link', {
          description: errorMessage,
        })

        // Call error callback if provided
        options?.onError?.(errorObj)
      } finally {
        setIsSharing(false)
      }
    },
    [options]
  )

  const reset = useCallback(() => {
    setShareUrl('')
    setPrivateBinUrl('')
    setError(null)
    setIsSharing(false)
  }, [])

  return {
    share,
    isSharing,
    shareUrl,
    privateBinUrl,
    error,
    reset,
  }
}
