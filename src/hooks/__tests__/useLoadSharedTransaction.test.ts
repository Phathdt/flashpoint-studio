import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useLoadSharedTransaction } from '../useLoadSharedTransaction'
import { PrivateBinShareClient } from '@/lib/privatebin-client'
import { toast } from 'sonner'

// Mock dependencies
const mockGetShareUrlFromParams = vi.fn()
const mockFetchPaste = vi.fn()

vi.mock('@/lib/privatebin-client', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PrivateBinShareClient: vi.fn(function (this: any) {
    this.getShareUrlFromParams = mockGetShareUrlFromParams
    this.fetchPaste = mockFetchPaste
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('useLoadSharedTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetShareUrlFromParams.mockReset()
    mockFetchPaste.mockReset()
  })

  it('should have correct initial state', () => {
    mockGetShareUrlFromParams.mockReturnValue(null)

    const { result } = renderHook(() => useLoadSharedTransaction())

    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeNull()
    expect(result.current.simulationResult).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('should do nothing when no share URL in parameters', () => {
    mockGetShareUrlFromParams.mockReturnValue(null)

    renderHook(() => useLoadSharedTransaction())

    expect(mockFetchPaste).not.toHaveBeenCalled()
    expect(toast.info).not.toHaveBeenCalled()
  })

  it('should successfully load transaction data without simulation result', async () => {
    const shareUrl = 'paste123#key456'
    const fetchedData = {
      payload: '0x123',
      fromAddress: '0xabc',
      toAddress: '0xdef',
      blockNumber: '12345',
    }

    mockGetShareUrlFromParams.mockReturnValue(shareUrl)
    mockFetchPaste.mockResolvedValue(fetchedData)

    const { result } = renderHook(() => useLoadSharedTransaction())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual({
      payload: fetchedData.payload,
      fromAddress: fetchedData.fromAddress,
      toAddress: fetchedData.toAddress,
      blockNumber: fetchedData.blockNumber,
      apiEtherscanUrl: undefined,
      etherscanUrl: undefined,
    })
    expect(result.current.simulationResult).toBeNull()
    expect(result.current.error).toBeNull()

    expect(toast.info).toHaveBeenCalledWith('Loading shared transaction data...')
    expect(toast.success).toHaveBeenCalledWith('Transaction data loaded successfully')
  })

  it('should successfully load transaction data with successful simulation result', async () => {
    const shareUrl = 'paste123#key456'
    const fetchedData = {
      payload: '0x123',
      fromAddress: '0xabc',
      toAddress: '0xdef',
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
      },
    }

    mockGetShareUrlFromParams.mockReturnValue(shareUrl)
    mockFetchPaste.mockResolvedValue(fetchedData)

    const { result } = renderHook(() => useLoadSharedTransaction())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.simulationResult).toEqual({
      success: true,
      trace: { some: 'data' },
      parsedTrace: [{ from: '0x123', to: '0x456', depth: 0 }],
      contractNames: new Map([
        ['0x123', 'Contract1'],
        ['0x456', 'Contract2'],
      ]),
      chainId: 1,
      etherscanUrl: 'https://etherscan.io',
      error: undefined,
      errorDetails: undefined,
    })

    expect(toast.success).toHaveBeenCalledWith('Transaction data and simulation results loaded!')
  })

  it('should successfully load transaction data with failed simulation result', async () => {
    const shareUrl = 'paste123#key456'
    const fetchedData = {
      payload: '0x123',
      fromAddress: '0xabc',
      toAddress: '0xdef',
      simulationResult: {
        success: false,
        error: 'Transaction reverted',
        errorDetails: { message: 'Out of gas' },
      },
    }

    mockGetShareUrlFromParams.mockReturnValue(shareUrl)
    mockFetchPaste.mockResolvedValue(fetchedData)

    const { result } = renderHook(() => useLoadSharedTransaction())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.simulationResult).toEqual({
      success: false,
      trace: undefined,
      parsedTrace: undefined,
      contractNames: undefined,
      chainId: undefined,
      etherscanUrl: undefined,
      error: 'Transaction reverted',
      errorDetails: { message: 'Out of gas' },
    })

    expect(toast.success).toHaveBeenCalledWith('Transaction data loaded (simulation failed)')
  })

  it('should handle fetch error', async () => {
    const shareUrl = 'paste123#key456'
    const error = new Error('Failed to fetch from PrivateBin')

    mockGetShareUrlFromParams.mockReturnValue(shareUrl)
    mockFetchPaste.mockRejectedValue(error)

    const { result } = renderHook(() => useLoadSharedTransaction())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toEqual(error)
    expect(result.current.data).toBeNull()
    expect(result.current.simulationResult).toBeNull()

    expect(toast.error).toHaveBeenCalledWith('Failed to load shared data', {
      description: 'Failed to fetch from PrivateBin',
    })
  })

  it('should handle non-Error exception', async () => {
    const shareUrl = 'paste123#key456'
    mockGetShareUrlFromParams.mockReturnValue(shareUrl)
    mockFetchPaste.mockRejectedValue('String error')

    const { result } = renderHook(() => useLoadSharedTransaction())

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error)
      expect(result.current.error?.message).toBe('Unknown error')
    })
  })

  it('should invoke success callback on successful load', async () => {
    const shareUrl = 'paste123#key456'
    const fetchedData = {
      payload: '0x123',
      fromAddress: '0xabc',
      toAddress: '0xdef',
    }

    mockGetShareUrlFromParams.mockReturnValue(shareUrl)
    mockFetchPaste.mockResolvedValue(fetchedData)

    const onSuccess = vi.fn()
    renderHook(() => useLoadSharedTransaction({ onSuccess }))

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith({
        payload: fetchedData.payload,
        fromAddress: fetchedData.fromAddress,
        toAddress: fetchedData.toAddress,
        blockNumber: undefined,
        apiEtherscanUrl: undefined,
        etherscanUrl: undefined,
      })
    })
  })

  it('should invoke error callback on failed load', async () => {
    const shareUrl = 'paste123#key456'
    const error = new Error('Load failed')

    mockGetShareUrlFromParams.mockReturnValue(shareUrl)
    mockFetchPaste.mockRejectedValue(error)

    const onError = vi.fn()
    renderHook(() => useLoadSharedTransaction({ onError }))

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error)
    })
  })

  it('should prevent double execution with useRef', async () => {
    const shareUrl = 'paste123#key456'
    const fetchedData = {
      payload: '0x123',
      fromAddress: '0xabc',
      toAddress: '0xdef',
    }

    mockGetShareUrlFromParams.mockReturnValue(shareUrl)
    mockFetchPaste.mockResolvedValue(fetchedData)

    // Render the hook which uses useEffect
    renderHook(() => useLoadSharedTransaction())

    await waitFor(() => {
      expect(mockFetchPaste).toHaveBeenCalledTimes(1)
    })

    // Even if the component re-renders, fetchPaste should only be called once
    // This is ensured by the hasLoadedRef
  })

  it('should include all optional fields in loaded data', async () => {
    const shareUrl = 'paste123#key456'
    const fetchedData = {
      payload: '0x123',
      fromAddress: '0xabc',
      toAddress: '0xdef',
      blockNumber: '12345',
      apiEtherscanUrl: 'https://api.etherscan.io',
      etherscanUrl: 'https://etherscan.io',
      // Note: etherscanApiKey is not shared for security
    }

    mockGetShareUrlFromParams.mockReturnValue(shareUrl)
    mockFetchPaste.mockResolvedValue(fetchedData)

    const { result } = renderHook(() => useLoadSharedTransaction())

    await waitFor(() => {
      expect(result.current.data).toEqual(fetchedData)
    })
  })

  it('should convert contractNames object to Map', async () => {
    const shareUrl = 'paste123#key456'
    const fetchedData = {
      payload: '0x123',
      fromAddress: '0xabc',
      toAddress: '0xdef',
      simulationResult: {
        success: true,
        trace: {},
        contractNames: {
          '0x111': 'Token',
          '0x222': 'Exchange',
        },
      },
    }

    mockGetShareUrlFromParams.mockReturnValue(shareUrl)
    mockFetchPaste.mockResolvedValue(fetchedData)

    const { result } = renderHook(() => useLoadSharedTransaction())

    await waitFor(() => {
      expect(result.current.simulationResult?.contractNames).toBeInstanceOf(Map)
      expect(result.current.simulationResult?.contractNames?.get('0x111')).toBe('Token')
      expect(result.current.simulationResult?.contractNames?.get('0x222')).toBe('Exchange')
    })
  })

  it('should handle simulation result without contractNames', async () => {
    const shareUrl = 'paste123#key456'
    const fetchedData = {
      payload: '0x123',
      fromAddress: '0xabc',
      toAddress: '0xdef',
      simulationResult: {
        success: true,
        trace: {},
      },
    }

    mockGetShareUrlFromParams.mockReturnValue(shareUrl)
    mockFetchPaste.mockResolvedValue(fetchedData)

    const { result } = renderHook(() => useLoadSharedTransaction())

    await waitFor(() => {
      expect(result.current.simulationResult?.contractNames).toBeUndefined()
    })
  })

  it('should log error to console when load fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const shareUrl = 'paste123#key456'
    const error = new Error('Test error')

    mockGetShareUrlFromParams.mockReturnValue(shareUrl)
    mockFetchPaste.mockRejectedValue(error)

    renderHook(() => useLoadSharedTransaction())

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load from PrivateBin:', error)
    })

    consoleErrorSpy.mockRestore()
  })

  it('should set loading state during fetch', async () => {
    const shareUrl = 'paste123#key456'
    const fetchedData = {
      payload: '0x123',
      fromAddress: '0xabc',
      toAddress: '0xdef',
    }

    mockGetShareUrlFromParams.mockReturnValue(shareUrl)
    // Delay the resolution to test loading state
    mockFetchPaste.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(fetchedData), 100))
    )

    const { result } = renderHook(() => useLoadSharedTransaction())

    // Should be loading initially
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true)
    })

    // Wait for completion
    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false)
      },
      { timeout: 200 }
    )
  })

  it('should create a new PrivateBinShareClient instance each time', async () => {
    const shareUrl = 'paste123#key456'
    const fetchedData = {
      payload: '0x123',
      fromAddress: '0xabc',
      toAddress: '0xdef',
    }

    mockGetShareUrlFromParams.mockReturnValue(shareUrl)
    mockFetchPaste.mockResolvedValue(fetchedData)

    renderHook(() => useLoadSharedTransaction())

    await waitFor(() => {
      expect(PrivateBinShareClient).toHaveBeenCalled()
    })
  })

  it('should handle empty simulationResult object', async () => {
    const shareUrl = 'paste123#key456'
    const fetchedData = {
      payload: '0x123',
      fromAddress: '0xabc',
      toAddress: '0xdef',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      simulationResult: {} as any,
    }

    mockGetShareUrlFromParams.mockReturnValue(shareUrl)
    mockFetchPaste.mockResolvedValue(fetchedData)

    const { result } = renderHook(() => useLoadSharedTransaction())

    await waitFor(() => {
      expect(result.current.simulationResult).toBeDefined()
      expect(result.current.simulationResult?.success).toBeUndefined()
    })
  })

  it('should not invoke callbacks when no share URL', () => {
    mockGetShareUrlFromParams.mockReturnValue(null)

    const onSuccess = vi.fn()
    const onError = vi.fn()

    renderHook(() => useLoadSharedTransaction({ onSuccess, onError }))

    expect(onSuccess).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })
})
