import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useShareTransaction } from '../useShareTransaction'
import { PrivateBinShareClient } from '@/lib/privatebin-client'
import { toast } from 'sonner'
import type { SimulationResult } from '@/lib/types'

// Mock dependencies
const mockCreatePaste = vi.fn()
const mockGenerateShareableUrl = vi.fn()
const mockGetPrivateBinUrl = vi.fn()

vi.mock('@/lib/privatebin-client', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PrivateBinShareClient: vi.fn(function (this: any) {
    this.createPaste = mockCreatePaste
    this.generateShareableUrl = mockGenerateShareableUrl
    this.getPrivateBinUrl = mockGetPrivateBinUrl
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('useShareTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreatePaste.mockReset()
    mockGenerateShareableUrl.mockReset()
    mockGetPrivateBinUrl.mockReset()
  })

  it('should have correct initial state', () => {
    const { result } = renderHook(() => useShareTransaction())

    expect(result.current.isSharing).toBe(false)
    expect(result.current.shareUrl).toBe('')
    expect(result.current.privateBinUrl).toBe('')
    expect(result.current.error).toBeNull()
    expect(typeof result.current.share).toBe('function')
    expect(typeof result.current.reset).toBe('function')
  })

  it('should successfully create share link without simulation result', async () => {
    const privatebinResponse = { url: 'paste123#key456' }
    const shareUrl = 'https://app.example.com?share=paste123#key456'
    const privateBinUrl = 'https://privatebin.net/?paste123#key456'

    mockCreatePaste.mockResolvedValue(privatebinResponse)
    mockGenerateShareableUrl.mockReturnValue(shareUrl)
    mockGetPrivateBinUrl.mockReturnValue(privateBinUrl)

    const { result } = renderHook(() => useShareTransaction())

    const shareData = {
      payload: '0x123',
      fromAddress: '0xabc',
      toAddress: '0xdef',
    }

    await act(async () => {
      await result.current.share(shareData)
    })

    await waitFor(
      () => {
        expect(result.current.isSharing).toBe(false)
        expect(result.current.shareUrl).toBe(shareUrl)
        expect(result.current.privateBinUrl).toBe(privateBinUrl)
      },
      { timeout: 3000 }
    )

    expect(result.current.error).toBeNull()

    expect(mockCreatePaste).toHaveBeenCalledWith({
      payload: shareData.payload,
      fromAddress: shareData.fromAddress,
      toAddress: shareData.toAddress,
      blockNumber: undefined,
      apiEtherscanUrl: undefined,
      etherscanUrl: undefined,
      simulationResult: undefined,
    })

    expect(toast.success).toHaveBeenCalledWith('Share link created!', {
      description: 'Link includes transaction data (simulate first to include results)',
    })
  })

  it('should successfully create share link with simulation result', async () => {
    const privatebinResponse = { url: 'paste123#key456' }
    const shareUrl = 'https://app.example.com?share=paste123#key456'
    const privateBinUrl = 'https://privatebin.net/?paste123#key456'

    mockCreatePaste.mockResolvedValue(privatebinResponse)
    mockGenerateShareableUrl.mockReturnValue(shareUrl)
    mockGetPrivateBinUrl.mockReturnValue(privateBinUrl)

    const simulationResult: SimulationResult = {
      success: true,
      trace: { some: 'data' },
      parsedTrace: [{ from: '0x123', to: '0x456', depth: 0 }],
      contractNames: new Map([
        ['0x123', 'Contract1'],
        ['0x456', 'Contract2'],
      ]),
      chainId: 1,
      etherscanUrl: 'https://etherscan.io',
    }

    const { result } = renderHook(() => useShareTransaction())

    const shareData = {
      payload: '0x123',
      fromAddress: '0xabc',
      toAddress: '0xdef',
      result: simulationResult,
    }

    await act(async () => {
      await result.current.share(shareData)
    })

    await waitFor(() => {
      expect(result.current.isSharing).toBe(false)
    })

    expect(mockCreatePaste).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: shareData.payload,
        fromAddress: shareData.fromAddress,
        toAddress: shareData.toAddress,
        simulationResult: {
          success: true,
          trace: { some: 'data' },
          parsedTrace: [{ from: '0x123', to: '0x456', depth: 0 }],
          contractNames: {
            '0x123': 'Contract1',
            '0x456': 'Contract2',
          },
          chainId: 1,
          etherscanUrl: 'https://etherscan.io',
          error: undefined,
          errorDetails: undefined,
        },
      })
    )

    expect(toast.success).toHaveBeenCalledWith('Share link created!', {
      description: 'Link includes transaction data and simulation results',
    })
  })

  it('should handle missing payload validation', async () => {
    const { result } = renderHook(() => useShareTransaction())

    const shareData = {
      payload: '',
      fromAddress: '0xabc',
      toAddress: '0xdef',
    }

    act(() => {
      result.current.share(shareData)
    })

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error)
    })

    expect(result.current.error?.message).toContain('Missing required fields')
    expect(mockCreatePaste).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Missing required fields', {
      description: 'Please fill in payload, from address, and to address before sharing',
    })
  })

  it('should handle missing fromAddress validation', async () => {
    const { result } = renderHook(() => useShareTransaction())

    const shareData = {
      payload: '0x123',
      fromAddress: '',
      toAddress: '0xdef',
    }

    act(() => {
      result.current.share(shareData)
    })

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error)
    })

    expect(result.current.error?.message).toContain('Missing required fields')
    expect(mockCreatePaste).not.toHaveBeenCalled()
  })

  it('should handle missing toAddress validation', async () => {
    const { result } = renderHook(() => useShareTransaction())

    const shareData = {
      payload: '0x123',
      fromAddress: '0xabc',
      toAddress: '',
    }

    act(() => {
      result.current.share(shareData)
    })

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error)
    })

    expect(result.current.error?.message).toContain('Missing required fields')
    expect(mockCreatePaste).not.toHaveBeenCalled()
  })

  it('should handle PrivateBin API error', async () => {
    const error = new Error('PrivateBin server error')
    mockCreatePaste.mockRejectedValue(error)

    const { result } = renderHook(() => useShareTransaction())

    const shareData = {
      payload: '0x123',
      fromAddress: '0xabc',
      toAddress: '0xdef',
    }

    await act(async () => {
      await result.current.share(shareData)
    })

    await waitFor(() => {
      expect(result.current.isSharing).toBe(false)
      expect(result.current.error).toEqual(error)
    })
    expect(result.current.shareUrl).toBe('')
    expect(result.current.privateBinUrl).toBe('')
    expect(toast.error).toHaveBeenCalledWith('Failed to create share link', {
      description: 'PrivateBin server error',
    })
  })

  it('should handle non-Error exception', async () => {
    mockCreatePaste.mockRejectedValue('String error')

    const { result } = renderHook(() => useShareTransaction())

    const shareData = {
      payload: '0x123',
      fromAddress: '0xabc',
      toAddress: '0xdef',
    }

    await act(async () => {
      await result.current.share(shareData)
    })

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error)
      expect(result.current.error?.message).toBe('Unknown error occurred')
    })
  })

  it('should cache client instance using useRef', async () => {
    const privatebinResponse = { url: 'paste123#key456' }
    mockCreatePaste.mockResolvedValue(privatebinResponse)
    mockGenerateShareableUrl.mockReturnValue('https://app.example.com?share=paste123#key456')
    mockGetPrivateBinUrl.mockReturnValue('https://privatebin.net/?paste123#key456')

    const { result } = renderHook(() => useShareTransaction())

    const shareData = {
      payload: '0x123',
      fromAddress: '0xabc',
      toAddress: '0xdef',
    }

    // First share
    await act(async () => {
      await result.current.share(shareData)
    })
    await waitFor(() => expect(result.current.isSharing).toBe(false))

    // Second share
    await act(async () => {
      await result.current.share(shareData)
    })
    await waitFor(() => expect(result.current.isSharing).toBe(false))

    // Client should only be created once
    expect(PrivateBinShareClient).toHaveBeenCalledTimes(1)
    // But createPaste should be called twice
    expect(mockCreatePaste).toHaveBeenCalledTimes(2)
  })

  it('should invoke success callback on successful share', async () => {
    const privatebinResponse = { url: 'paste123#key456' }
    const shareUrl = 'https://app.example.com?share=paste123#key456'
    const privateBinUrl = 'https://privatebin.net/?paste123#key456'

    mockCreatePaste.mockResolvedValue(privatebinResponse)
    mockGenerateShareableUrl.mockReturnValue(shareUrl)
    mockGetPrivateBinUrl.mockReturnValue(privateBinUrl)

    const onSuccess = vi.fn()
    const { result } = renderHook(() => useShareTransaction({ onSuccess }))

    const shareData = {
      payload: '0x123',
      fromAddress: '0xabc',
      toAddress: '0xdef',
    }

    await act(async () => {
      await result.current.share(shareData)
    })

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(shareUrl, privateBinUrl)
    })
  })

  it('should invoke error callback on failed share', async () => {
    const error = new Error('Share failed')
    mockCreatePaste.mockRejectedValue(error)

    const onError = vi.fn()
    const { result } = renderHook(() => useShareTransaction({ onError }))

    const shareData = {
      payload: '0x123',
      fromAddress: '0xabc',
      toAddress: '0xdef',
    }

    await act(async () => {
      await result.current.share(shareData)
    })

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error)
    })
  })

  it('should invoke error callback on validation failure', async () => {
    const onError = vi.fn()
    const { result } = renderHook(() => useShareTransaction({ onError }))

    const shareData = {
      payload: '',
      fromAddress: '0xabc',
      toAddress: '0xdef',
    }

    await act(async () => {
      await result.current.share(shareData)
    })

    expect(onError).toHaveBeenCalledWith(expect.any(Error))
    expect(onError.mock.calls[0][0].message).toContain('Missing required fields')
  })

  it('should reset all state when reset is called', async () => {
    const privatebinResponse = { url: 'paste123#key456' }
    mockCreatePaste.mockResolvedValue(privatebinResponse)
    mockGenerateShareableUrl.mockReturnValue('https://app.example.com?share=paste123#key456')
    mockGetPrivateBinUrl.mockReturnValue('https://privatebin.net/?paste123#key456')

    const { result } = renderHook(() => useShareTransaction())

    const shareData = {
      payload: '0x123',
      fromAddress: '0xabc',
      toAddress: '0xdef',
    }

    // Create share
    await act(async () => {
      await result.current.share(shareData)
    })
    await waitFor(
      () => {
        expect(result.current.isSharing).toBe(false)
        expect(result.current.shareUrl).not.toBe('')
      },
      { timeout: 3000 }
    )

    // Reset
    act(() => {
      result.current.reset()
    })

    expect(result.current.shareUrl).toBe('')
    expect(result.current.privateBinUrl).toBe('')
    expect(result.current.error).toBeNull()
    expect(result.current.isSharing).toBe(false)
  })

  it('should include optional parameters in share data', async () => {
    const privatebinResponse = { url: 'paste123#key456' }
    mockCreatePaste.mockResolvedValue(privatebinResponse)
    mockGenerateShareableUrl.mockReturnValue('https://app.example.com?share=paste123#key456')
    mockGetPrivateBinUrl.mockReturnValue('https://privatebin.net/?paste123#key456')

    const { result } = renderHook(() => useShareTransaction())

    const shareData = {
      payload: '0x123',
      fromAddress: '0xabc',
      toAddress: '0xdef',
      blockNumber: '12345',
      apiEtherscanUrl: 'https://api.etherscan.io',
      etherscanUrl: 'https://etherscan.io',
      etherscanApiKey: 'test-key', // This will not be shared (security)
    }

    await act(async () => {
      await result.current.share(shareData)
    })

    await waitFor(() => {
      expect(mockCreatePaste).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: shareData.payload,
          fromAddress: shareData.fromAddress,
          toAddress: shareData.toAddress,
          blockNumber: shareData.blockNumber,
          apiEtherscanUrl: shareData.apiEtherscanUrl,
          etherscanUrl: shareData.etherscanUrl,
          // Note: etherscanApiKey should NOT be in the call (not shared for security)
        })
      )
    })
  })

  it('should convert Map to object for contractNames in simulationResult', async () => {
    const privatebinResponse = { url: 'paste123#key456' }
    mockCreatePaste.mockResolvedValue(privatebinResponse)
    mockGenerateShareableUrl.mockReturnValue('https://app.example.com?share=paste123#key456')
    mockGetPrivateBinUrl.mockReturnValue('https://privatebin.net/?paste123#key456')

    const simulationResult: SimulationResult = {
      success: true,
      trace: {},
      contractNames: new Map([
        ['0x111', 'Token'],
        ['0x222', 'Exchange'],
      ]),
    }

    const { result } = renderHook(() => useShareTransaction())

    const shareData = {
      payload: '0x123',
      fromAddress: '0xabc',
      toAddress: '0xdef',
      result: simulationResult,
    }

    await act(async () => {
      await result.current.share(shareData)
    })

    await waitFor(() => {
      expect(mockCreatePaste).toHaveBeenCalledWith(
        expect.objectContaining({
          simulationResult: expect.objectContaining({
            contractNames: {
              '0x111': 'Token',
              '0x222': 'Exchange',
            },
          }),
        })
      )
    })
  })

  it('should log error to console when share fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const error = new Error('Test error')
    mockCreatePaste.mockRejectedValue(error)

    const { result } = renderHook(() => useShareTransaction())

    const shareData = {
      payload: '0x123',
      fromAddress: '0xabc',
      toAddress: '0xdef',
    }

    await act(async () => {
      await result.current.share(shareData)
    })

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Share error:', error)
    })

    consoleErrorSpy.mockRestore()
  })
})
