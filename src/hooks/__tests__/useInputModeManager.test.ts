import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useInputModeManager } from '../useInputModeManager'
import { InputMode } from '@/lib/constants'

describe('useInputModeManager', () => {
  let mockSetValue: ReturnType<typeof vi.fn>
  let mockResetFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockSetValue = vi.fn()
    mockResetFetch = vi.fn()
  })

  it('should have correct initial state', () => {
    const { result } = renderHook(() =>
      useInputModeManager(InputMode.MANUAL, mockSetValue, mockResetFetch)
    )

    expect(result.current.inputMode).toBe(InputMode.MANUAL)
    expect(typeof result.current.setInputMode).toBe('function')
  })

  it('should initialize with manual mode by default', () => {
    const { result } = renderHook(() =>
      useInputModeManager(InputMode.MANUAL, mockSetValue, mockResetFetch)
    )

    expect(result.current.inputMode).toBe(InputMode.MANUAL)
  })

  it('should clear txHash when switching to manual mode', async () => {
    const { rerender } = renderHook(
      ({ watchedMode }) => useInputModeManager(watchedMode, mockSetValue, mockResetFetch),
      {
        initialProps: { watchedMode: InputMode.TX_HASH },
      }
    )

    // Switch to manual mode
    rerender({ watchedMode: InputMode.MANUAL })

    await waitFor(() => {
      expect(mockSetValue).toHaveBeenCalledWith('txHash', undefined)
      expect(mockResetFetch).toHaveBeenCalled()
    })
  })

  it('should clear manual fields when switching to txHash mode', async () => {
    const { rerender } = renderHook(
      ({ watchedMode }) => useInputModeManager(watchedMode, mockSetValue, mockResetFetch),
      {
        initialProps: { watchedMode: InputMode.MANUAL },
      }
    )

    // Switch to txHash mode
    rerender({ watchedMode: InputMode.TX_HASH })

    await waitFor(() => {
      expect(mockSetValue).toHaveBeenCalledWith('fromAddress', '')
      expect(mockSetValue).toHaveBeenCalledWith('toAddress', '')
      expect(mockSetValue).toHaveBeenCalledWith('payload', '')
      expect(mockSetValue).toHaveBeenCalledWith('blockNumber', '')
      expect(mockResetFetch).toHaveBeenCalled()
    })
  })

  it('should not trigger field clearing when mode remains the same', async () => {
    const { rerender } = renderHook(
      ({ watchedMode }) => useInputModeManager(watchedMode, mockSetValue, mockResetFetch),
      {
        initialProps: { watchedMode: InputMode.MANUAL },
      }
    )

    mockSetValue.mockClear()
    mockResetFetch.mockClear()

    // Rerender with same mode
    rerender({ watchedMode: InputMode.MANUAL })

    expect(mockSetValue).not.toHaveBeenCalled()
    expect(mockResetFetch).not.toHaveBeenCalled()
  })

  it('should update internal state when mode changes', async () => {
    const { result, rerender } = renderHook(
      ({ watchedMode }) => useInputModeManager(watchedMode, mockSetValue, mockResetFetch),
      {
        initialProps: { watchedMode: InputMode.MANUAL },
      }
    )

    expect(result.current.inputMode).toBe(InputMode.MANUAL)

    // Switch to txHash mode
    rerender({ watchedMode: InputMode.TX_HASH })

    await waitFor(() => {
      expect(result.current.inputMode).toBe(InputMode.TX_HASH)
    })
  })

  it('should call resetFetch before clearing fields', async () => {
    const callOrder: string[] = []

    mockResetFetch.mockImplementation(() => {
      callOrder.push('resetFetch')
    })

    mockSetValue.mockImplementation(() => {
      callOrder.push('setValue')
    })

    const { rerender } = renderHook(
      ({ watchedMode }) => useInputModeManager(watchedMode, mockSetValue, mockResetFetch),
      {
        initialProps: { watchedMode: InputMode.MANUAL },
      }
    )

    // Switch to txHash mode
    rerender({ watchedMode: InputMode.TX_HASH })

    await waitFor(() => {
      expect(mockResetFetch).toHaveBeenCalled()
    })

    // resetFetch should be called before setValue
    expect(callOrder[0]).toBe('resetFetch')
    expect(callOrder.slice(1).every((call) => call === 'setValue')).toBe(true)
  })

  it('should handle multiple rapid mode switches', async () => {
    const { rerender } = renderHook(
      ({ watchedMode }) => useInputModeManager(watchedMode, mockSetValue, mockResetFetch),
      {
        initialProps: { watchedMode: InputMode.MANUAL },
      }
    )

    // Switch to txHash
    rerender({ watchedMode: InputMode.TX_HASH })

    await waitFor(() => {
      expect(mockResetFetch).toHaveBeenCalledTimes(1)
    })

    mockSetValue.mockClear()
    mockResetFetch.mockClear()

    // Switch back to manual
    rerender({ watchedMode: InputMode.MANUAL })

    await waitFor(() => {
      expect(mockResetFetch).toHaveBeenCalledTimes(1)
      expect(mockSetValue).toHaveBeenCalledWith('txHash', undefined)
    })
  })

  it('should expose setInputMode function', () => {
    const { result } = renderHook(() =>
      useInputModeManager(InputMode.MANUAL, mockSetValue, mockResetFetch)
    )

    expect(typeof result.current.setInputMode).toBe('function')

    // Note: Calling setInputMode directly doesn't trigger the useEffect
    // because it only reacts to watchedInputMode changes.
    // Internal state update via setInputMode doesn't cause re-execution of useEffect
    expect(result.current.inputMode).toBe(InputMode.MANUAL)
  })

  it('should handle initial txHash mode', async () => {
    const { result } = renderHook(() =>
      useInputModeManager(InputMode.TX_HASH, mockSetValue, mockResetFetch)
    )

    // Internal state starts at MANUAL, so switching to TX_HASH will trigger field clearing
    await waitFor(() => {
      expect(result.current.inputMode).toBe(InputMode.TX_HASH)
    })

    // Should have cleared manual fields (4 calls)
    expect(mockSetValue).toHaveBeenCalledTimes(4)
    expect(mockResetFetch).toHaveBeenCalled()
  })

  it('should clear exactly 4 fields when switching from manual to txHash', async () => {
    const { rerender } = renderHook(
      ({ watchedMode }) => useInputModeManager(watchedMode, mockSetValue, mockResetFetch),
      {
        initialProps: { watchedMode: InputMode.MANUAL },
      }
    )

    // No fields cleared on initial render (already in MANUAL mode)
    expect(mockSetValue).not.toHaveBeenCalled()

    // Switch to txHash mode
    rerender({ watchedMode: InputMode.TX_HASH })

    await waitFor(() => {
      expect(mockSetValue).toHaveBeenCalledTimes(4)
    })

    expect(mockSetValue).toHaveBeenCalledWith('fromAddress', '')
    expect(mockSetValue).toHaveBeenCalledWith('toAddress', '')
    expect(mockSetValue).toHaveBeenCalledWith('payload', '')
    expect(mockSetValue).toHaveBeenCalledWith('blockNumber', '')
  })

  it('should clear exactly 1 field when switching from txHash to manual', async () => {
    const { rerender } = renderHook(
      ({ watchedMode }) => useInputModeManager(watchedMode, mockSetValue, mockResetFetch),
      {
        initialProps: { watchedMode: InputMode.TX_HASH },
      }
    )

    // First render with TX_HASH will trigger clearing of manual fields (4 calls)
    // because internal state starts at MANUAL
    await waitFor(() => {
      expect(mockSetValue).toHaveBeenCalledTimes(4)
    })

    mockSetValue.mockClear()
    mockResetFetch.mockClear()

    // Now switch to manual mode - should only clear txHash
    rerender({ watchedMode: InputMode.MANUAL })

    await waitFor(() => {
      expect(mockSetValue).toHaveBeenCalledTimes(1)
    })

    expect(mockSetValue).toHaveBeenCalledWith('txHash', undefined)
  })

  it('should work with generic form type', async () => {
    interface CustomForm {
      inputMode: string
      customField: string
    }

    const customSetValue = vi.fn<[path: keyof CustomForm, value: string | undefined], void>()

    const { rerender } = renderHook(
      ({ watchedMode }) =>
        useInputModeManager<CustomForm>(watchedMode, customSetValue as never, mockResetFetch),
      {
        initialProps: { watchedMode: InputMode.MANUAL },
      }
    )

    rerender({ watchedMode: InputMode.TX_HASH })

    await waitFor(() => {
      expect(customSetValue).toHaveBeenCalled()
    })
  })
})
