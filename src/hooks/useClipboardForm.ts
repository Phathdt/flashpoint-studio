import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import type { FormData, UseClipboardFormOptions, UseClipboardFormReturn } from './types'

/**
 * Custom hook for copying and pasting form data to/from clipboard
 *
 * Handles:
 * - Copying all form fields to clipboard as JSON
 * - Parsing and validating JSON from clipboard
 * - Loading states during async clipboard operations
 * - Success and error notifications
 * - Clipboard API permission handling
 *
 * @param options - Optional callbacks for success and error handling
 * @returns Copy and paste functions with loading states
 *
 * @example
 * ```tsx
 * const { copyToClipboard, pasteFromClipboard, isCopying, isPasting } = useClipboardForm({
 *   onCopySuccess: () => {
 *     console.log('Data copied!')
 *   },
 *   onPasteSuccess: (data) => {
 *     // Auto-populate form with pasted data
 *     setValue('payload', data.payload)
 *     setValue('fromAddress', data.fromAddress)
 *     setValue('toAddress', data.toAddress)
 *   }
 * })
 *
 * // Copy current form data
 * await copyToClipboard(getValues())
 *
 * // Paste and restore form data
 * await pasteFromClipboard()
 * ```
 */
export function useClipboardForm(options?: UseClipboardFormOptions): UseClipboardFormReturn {
  const [isCopying, setIsCopying] = useState(false)
  const [isPasting, setIsPasting] = useState(false)

  const copyToClipboard = useCallback(
    async (data: FormData) => {
      setIsCopying(true)

      try {
        // Prepare form data with all fields
        const formData = {
          rpcUrl: data.rpcUrl || '',
          fromAddress: data.fromAddress || '',
          toAddress: data.toAddress || '',
          payload: data.payload || '',
          blockNumber: data.blockNumber || '',
          apiEtherscanUrl: data.apiEtherscanUrl || '',
          etherscanUrl: data.etherscanUrl || '',
          etherscanApiKey: data.etherscanApiKey || '',
        }

        await navigator.clipboard.writeText(JSON.stringify(formData, null, 2))

        toast.success('Copied to clipboard!', {
          description: 'Form data has been copied',
        })

        // Call success callback if provided
        options?.onCopySuccess?.()
      } catch (error) {
        console.error('Failed to copy to clipboard:', error)
        const errorObj = error instanceof Error ? error : new Error('Unknown error')

        toast.error('Failed to copy', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })

        // Call error callback if provided
        options?.onCopyError?.(errorObj)
      } finally {
        setIsCopying(false)
      }
    },
    [options]
  )

  const pasteFromClipboard = useCallback(async () => {
    setIsPasting(true)

    try {
      const clipboardText = await navigator.clipboard.readText()
      const formData = JSON.parse(clipboardText) as Partial<FormData>

      // Validate that we have at least some recognizable form fields
      if (!formData.payload && !formData.fromAddress && !formData.toAddress && !formData.rpcUrl) {
        throw new Error('Clipboard does not contain valid form data')
      }

      // Create complete form data object with defaults
      const completeFormData: FormData = {
        rpcUrl: formData.rpcUrl || '',
        fromAddress: formData.fromAddress || '',
        toAddress: formData.toAddress || '',
        payload: formData.payload || '',
        blockNumber: formData.blockNumber,
        apiEtherscanUrl: formData.apiEtherscanUrl,
        etherscanUrl: formData.etherscanUrl,
        etherscanApiKey: formData.etherscanApiKey,
      }

      toast.success('Pasted from clipboard!', {
        description: 'Form data has been restored',
      })

      // Call success callback if provided
      options?.onPasteSuccess?.(completeFormData)

      return completeFormData
    } catch (error) {
      console.error('Failed to paste from clipboard:', error)
      const errorObj = error instanceof Error ? error : new Error('Unknown error')

      toast.error('Failed to paste', {
        description:
          error instanceof Error ? error.message : 'Invalid clipboard data or permission denied',
      })

      // Call error callback if provided
      options?.onPasteError?.(errorObj)

      return null
    } finally {
      setIsPasting(false)
    }
  }, [options])

  return {
    copyToClipboard,
    pasteFromClipboard,
    isCopying,
    isPasting,
  }
}
