import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useClipboardForm } from '../useClipboardForm'
import { toast } from 'sonner'
import type { FormData } from '../types'

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('useClipboardForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset clipboard mocks
    vi.mocked(navigator.clipboard.writeText).mockResolvedValue(undefined)
    vi.mocked(navigator.clipboard.readText).mockResolvedValue('')
  })

  it('should have correct initial state', () => {
    const { result } = renderHook(() => useClipboardForm())

    expect(result.current.isCopying).toBe(false)
    expect(result.current.isPasting).toBe(false)
    expect(typeof result.current.copyToClipboard).toBe('function')
    expect(typeof result.current.pasteFromClipboard).toBe('function')
  })

  it('should successfully copy form data to clipboard', async () => {
    const { result } = renderHook(() => useClipboardForm())

    const formData: FormData = {
      rpcUrl: 'https://eth.llamarpc.com',
      fromAddress: '0xabc',
      toAddress: '0xdef',
      payload: '0x123',
      blockNumber: '12345',
    }

    await act(async () => {
      await result.current.copyToClipboard(formData)
    })

    await waitFor(() => {
      expect(result.current.isCopying).toBe(false)
    })

    const expectedJson = JSON.stringify(
      {
        rpcUrl: formData.rpcUrl,
        fromAddress: formData.fromAddress,
        toAddress: formData.toAddress,
        payload: formData.payload,
        blockNumber: formData.blockNumber,
        apiEtherscanUrl: '',
        etherscanUrl: '',
        etherscanApiKey: '',
      },
      null,
      2
    )

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expectedJson)
    expect(toast.success).toHaveBeenCalledWith('Copied to clipboard!', {
      description: 'Form data has been copied',
    })
  })

  it('should copy form data with all optional fields', async () => {
    const { result } = renderHook(() => useClipboardForm())

    const formData: FormData = {
      rpcUrl: 'https://eth.llamarpc.com',
      fromAddress: '0xabc',
      toAddress: '0xdef',
      payload: '0x123',
      blockNumber: '12345',
      apiEtherscanUrl: 'https://api.etherscan.io',
      etherscanUrl: 'https://etherscan.io',
      etherscanApiKey: 'test-key',
    }

    await act(async () => {
      await result.current.copyToClipboard(formData)
    })

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled()
    })

    const call = vi.mocked(navigator.clipboard.writeText).mock.calls[0][0]
    const parsed = JSON.parse(call)

    expect(parsed).toEqual(formData)
  })

  it('should handle empty optional fields when copying', async () => {
    const { result } = renderHook(() => useClipboardForm())

    const formData: FormData = {
      rpcUrl: 'https://eth.llamarpc.com',
      fromAddress: '0xabc',
      toAddress: '0xdef',
      payload: '0x123',
    }

    await act(async () => {
      await result.current.copyToClipboard(formData)
    })

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled()
    })

    const call = vi.mocked(navigator.clipboard.writeText).mock.calls[0][0]
    const parsed = JSON.parse(call)

    expect(parsed.apiEtherscanUrl).toBe('')
    expect(parsed.etherscanUrl).toBe('')
    expect(parsed.etherscanApiKey).toBe('')
  })

  it('should handle clipboard write error', async () => {
    const error = new Error('Clipboard write failed')
    vi.mocked(navigator.clipboard.writeText).mockRejectedValue(error)

    const { result } = renderHook(() => useClipboardForm())

    const formData: FormData = {
      rpcUrl: 'https://eth.llamarpc.com',
      fromAddress: '0xabc',
      toAddress: '0xdef',
      payload: '0x123',
    }

    await act(async () => {
      await result.current.copyToClipboard(formData)
    })

    await waitFor(() => {
      expect(result.current.isCopying).toBe(false)
    })

    expect(toast.error).toHaveBeenCalledWith('Failed to copy', {
      description: 'Clipboard write failed',
    })
  })

  it('should handle non-Error exception when copying', async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValue('String error')

    const { result } = renderHook(() => useClipboardForm())

    const formData: FormData = {
      rpcUrl: 'https://eth.llamarpc.com',
      fromAddress: '0xabc',
      toAddress: '0xdef',
      payload: '0x123',
    }

    await act(async () => {
      await result.current.copyToClipboard(formData)
    })

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to copy', {
        description: 'Unknown error',
      })
    })
  })

  it('should successfully paste and parse form data', async () => {
    const formData: FormData = {
      rpcUrl: 'https://eth.llamarpc.com',
      fromAddress: '0xabc',
      toAddress: '0xdef',
      payload: '0x123',
      blockNumber: '12345',
    }

    vi.mocked(navigator.clipboard.readText).mockResolvedValue(JSON.stringify(formData))

    const { result } = renderHook(() => useClipboardForm())

    let pastedData
    await act(async () => {
      pastedData = await result.current.pasteFromClipboard()
    })

    await waitFor(() => {
      expect(result.current.isPasting).toBe(false)
    })

    expect(pastedData).toEqual({
      rpcUrl: formData.rpcUrl,
      fromAddress: formData.fromAddress,
      toAddress: formData.toAddress,
      payload: formData.payload,
      blockNumber: formData.blockNumber,
      apiEtherscanUrl: undefined,
      etherscanUrl: undefined,
      etherscanApiKey: undefined,
    })

    expect(toast.success).toHaveBeenCalledWith('Pasted from clipboard!', {
      description: 'Form data has been restored',
    })
  })

  it('should handle partial form data when pasting', async () => {
    const partialData = {
      payload: '0x123',
      fromAddress: '0xabc',
    }

    vi.mocked(navigator.clipboard.readText).mockResolvedValue(JSON.stringify(partialData))

    const { result } = renderHook(() => useClipboardForm())

    let pastedData
    await act(async () => {
      pastedData = await result.current.pasteFromClipboard()
    })

    expect(pastedData).toEqual({
      rpcUrl: '',
      fromAddress: '0xabc',
      toAddress: '',
      payload: '0x123',
      blockNumber: undefined,
      apiEtherscanUrl: undefined,
      etherscanUrl: undefined,
      etherscanApiKey: undefined,
    })
  })

  it('should reject invalid clipboard data', async () => {
    const invalidData = {
      someOtherField: 'value',
      unrelatedData: 'test',
    }

    vi.mocked(navigator.clipboard.readText).mockResolvedValue(JSON.stringify(invalidData))

    const { result } = renderHook(() => useClipboardForm())

    let pastedData
    await act(async () => {
      pastedData = await result.current.pasteFromClipboard()
    })

    await waitFor(() => {
      expect(result.current.isPasting).toBe(false)
    })

    expect(pastedData).toBeNull()
    expect(toast.error).toHaveBeenCalledWith('Failed to paste', {
      description: 'Clipboard does not contain valid form data',
    })
  })

  it('should handle clipboard read error', async () => {
    const error = new Error('Clipboard read failed')
    vi.mocked(navigator.clipboard.readText).mockRejectedValue(error)

    const { result } = renderHook(() => useClipboardForm())

    let pastedData
    await act(async () => {
      pastedData = await result.current.pasteFromClipboard()
    })

    await waitFor(() => {
      expect(result.current.isPasting).toBe(false)
    })

    expect(pastedData).toBeNull()
    expect(toast.error).toHaveBeenCalledWith('Failed to paste', {
      description: 'Clipboard read failed',
    })
  })

  it('should handle JSON parse error', async () => {
    vi.mocked(navigator.clipboard.readText).mockResolvedValue('invalid json {')

    const { result } = renderHook(() => useClipboardForm())

    let pastedData
    await act(async () => {
      pastedData = await result.current.pasteFromClipboard()
    })

    await waitFor(() => {
      expect(result.current.isPasting).toBe(false)
    })

    expect(pastedData).toBeNull()
    expect(toast.error).toHaveBeenCalledWith('Failed to paste', expect.any(Object))
  })

  it('should invoke onCopySuccess callback', async () => {
    const onCopySuccess = vi.fn()
    const { result } = renderHook(() => useClipboardForm({ onCopySuccess }))

    const formData: FormData = {
      rpcUrl: 'https://eth.llamarpc.com',
      fromAddress: '0xabc',
      toAddress: '0xdef',
      payload: '0x123',
    }

    await act(async () => {
      await result.current.copyToClipboard(formData)
    })

    await waitFor(() => {
      expect(onCopySuccess).toHaveBeenCalled()
    })
  })

  it('should invoke onCopyError callback', async () => {
    const error = new Error('Copy failed')
    vi.mocked(navigator.clipboard.writeText).mockRejectedValue(error)

    const onCopyError = vi.fn()
    const { result } = renderHook(() => useClipboardForm({ onCopyError }))

    const formData: FormData = {
      rpcUrl: 'https://eth.llamarpc.com',
      fromAddress: '0xabc',
      toAddress: '0xdef',
      payload: '0x123',
    }

    await act(async () => {
      await result.current.copyToClipboard(formData)
    })

    await waitFor(() => {
      expect(onCopyError).toHaveBeenCalledWith(error)
    })
  })

  it('should invoke onPasteSuccess callback', async () => {
    const formData: FormData = {
      rpcUrl: 'https://eth.llamarpc.com',
      fromAddress: '0xabc',
      toAddress: '0xdef',
      payload: '0x123',
    }

    vi.mocked(navigator.clipboard.readText).mockResolvedValue(JSON.stringify(formData))

    const onPasteSuccess = vi.fn()
    const { result } = renderHook(() => useClipboardForm({ onPasteSuccess }))

    await act(async () => {
      await result.current.pasteFromClipboard()
    })

    await waitFor(() => {
      expect(onPasteSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          rpcUrl: formData.rpcUrl,
          fromAddress: formData.fromAddress,
          toAddress: formData.toAddress,
          payload: formData.payload,
        })
      )
    })
  })

  it('should invoke onPasteError callback', async () => {
    const error = new Error('Paste failed')
    vi.mocked(navigator.clipboard.readText).mockRejectedValue(error)

    const onPasteError = vi.fn()
    const { result } = renderHook(() => useClipboardForm({ onPasteError }))

    await act(async () => {
      await result.current.pasteFromClipboard()
    })

    await waitFor(() => {
      expect(onPasteError).toHaveBeenCalledWith(error)
    })
  })

  it('should log error to console when copy fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const error = new Error('Test error')
    vi.mocked(navigator.clipboard.writeText).mockRejectedValue(error)

    const { result } = renderHook(() => useClipboardForm())

    const formData: FormData = {
      rpcUrl: 'https://eth.llamarpc.com',
      fromAddress: '0xabc',
      toAddress: '0xdef',
      payload: '0x123',
    }

    await act(async () => {
      await result.current.copyToClipboard(formData)
    })

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to copy to clipboard:', error)
    })

    consoleErrorSpy.mockRestore()
  })

  it('should log error to console when paste fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const error = new Error('Test error')
    vi.mocked(navigator.clipboard.readText).mockRejectedValue(error)

    const { result } = renderHook(() => useClipboardForm())

    await act(async () => {
      await result.current.pasteFromClipboard()
    })

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to paste from clipboard:', error)
    })

    consoleErrorSpy.mockRestore()
  })

  it('should set isCopying to true during copy operation', async () => {
    // Delay the clipboard write
    vi.mocked(navigator.clipboard.writeText).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(), 100))
    )

    const { result } = renderHook(() => useClipboardForm())

    const formData: FormData = {
      rpcUrl: 'https://eth.llamarpc.com',
      fromAddress: '0xabc',
      toAddress: '0xdef',
      payload: '0x123',
    }

    let copyPromise
    act(() => {
      copyPromise = result.current.copyToClipboard(formData)
    })

    // Should be copying
    await waitFor(() => {
      expect(result.current.isCopying).toBe(true)
    })

    await act(async () => {
      await copyPromise
    })

    // Should not be copying anymore
    await waitFor(() => {
      expect(result.current.isCopying).toBe(false)
    })
  })

  it('should set isPasting to true during paste operation', async () => {
    const formData: FormData = {
      rpcUrl: 'https://eth.llamarpc.com',
      fromAddress: '0xabc',
      toAddress: '0xdef',
      payload: '0x123',
    }

    // Delay the clipboard read
    vi.mocked(navigator.clipboard.readText).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(JSON.stringify(formData)), 100))
    )

    const { result } = renderHook(() => useClipboardForm())

    let pastePromise
    act(() => {
      pastePromise = result.current.pasteFromClipboard()
    })

    // Should be pasting
    await waitFor(() => {
      expect(result.current.isPasting).toBe(true)
    })

    await act(async () => {
      await pastePromise
    })

    // Should not be pasting anymore
    await waitFor(() => {
      expect(result.current.isPasting).toBe(false)
    })
  })

  it('should accept form data with only rpcUrl as valid', async () => {
    const partialData = {
      rpcUrl: 'https://eth.llamarpc.com',
    }

    vi.mocked(navigator.clipboard.readText).mockResolvedValue(JSON.stringify(partialData))

    const { result } = renderHook(() => useClipboardForm())

    let pastedData
    await act(async () => {
      pastedData = await result.current.pasteFromClipboard()
    })

    expect(pastedData).not.toBeNull()
    expect(pastedData?.rpcUrl).toBe('https://eth.llamarpc.com')
    expect(toast.success).toHaveBeenCalled()
  })

  it('should accept form data with only toAddress as valid', async () => {
    const partialData = {
      toAddress: '0xdef',
    }

    vi.mocked(navigator.clipboard.readText).mockResolvedValue(JSON.stringify(partialData))

    const { result } = renderHook(() => useClipboardForm())

    let pastedData
    await act(async () => {
      pastedData = await result.current.pasteFromClipboard()
    })

    expect(pastedData).not.toBeNull()
    expect(pastedData?.toAddress).toBe('0xdef')
    expect(toast.success).toHaveBeenCalled()
  })
})
