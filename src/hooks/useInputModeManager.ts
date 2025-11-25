import { useState, useEffect } from 'react'
import type { UseFormSetValue, Path, PathValue } from 'react-hook-form'
import { InputMode } from '@/lib/constants'

/**
 * Hook to manage input mode state and synchronization
 * Handles mode switching and field clearing logic
 */
export function useInputModeManager<T extends Record<string, unknown>>(
  watchedInputMode: InputMode,
  setValue: UseFormSetValue<T>,
  resetFetch: () => void
) {
  const [inputMode, setInputMode] = useState<InputMode>(InputMode.MANUAL)

  /**
   * Handle input mode changes
   * Clears mode-specific fields when switching between modes
   */
  useEffect(() => {
    if (watchedInputMode !== inputMode) {
      setInputMode(watchedInputMode)
      resetFetch()

      // Clear mode-specific fields
      if (watchedInputMode === InputMode.MANUAL) {
        // Switching to manual mode - clear txHash
        setValue('txHash' as Path<T>, undefined as PathValue<T, Path<T>>)
      } else {
        // Switching to txHash mode - clear manual fields
        setValue('fromAddress' as Path<T>, '' as PathValue<T, Path<T>>)
        setValue('toAddress' as Path<T>, '' as PathValue<T, Path<T>>)
        setValue('payload' as Path<T>, '' as PathValue<T, Path<T>>)
        setValue('blockNumber' as Path<T>, '' as PathValue<T, Path<T>>)
      }
    }
  }, [watchedInputMode, inputMode, setValue, resetFetch])

  return {
    inputMode,
    setInputMode,
  }
}

export interface UseInputModeManagerReturn {
  inputMode: InputMode
  setInputMode: (mode: InputMode) => void
}
