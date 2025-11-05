import { useState, useCallback } from 'react'
import { toast } from 'sonner'

/**
 * Custom hook for copying text to clipboard
 *
 * Provides:
 * - Copy function with toast notifications
 * - Loading state during copy operation
 * - Error handling
 *
 * @returns Copy function and state
 *
 * @example
 * ```tsx
 * const { copyToClipboard, isCopying } = useCopyToClipboard()
 *
 * <button onClick={() => copyToClipboard('0x123...', 'Address')}>
 *   Copy
 * </button>
 * ```
 */
export function useCopyToClipboard() {
  const [isCopying, setIsCopying] = useState(false)

  const copyToClipboard = useCallback(async (text: string, label?: string) => {
    setIsCopying(true)

    try {
      await navigator.clipboard.writeText(text)

      toast.success('Copied to clipboard', {
        description: label ? `${label} copied` : 'Text copied',
        duration: 1500,
      })
    } catch (error) {
      console.error('Failed to copy:', error)

      toast.error('Failed to copy', {
        description: 'Could not access clipboard',
      })
    } finally {
      setIsCopying(false)
    }
  }, [])

  return {
    copyToClipboard,
    isCopying,
  }
}
