import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useSimulation } from '../useSimulation'
import { SimulationService } from '@/lib/simulation-service'
import { toast } from 'sonner'
import type { SimulationResult } from '@/lib/types'

// Mock dependencies
const mockSimulate = vi.fn()

vi.mock('@/lib/simulation-service', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SimulationService: vi.fn(function (this: any) {
    this.simulate = mockSimulate
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('useSimulation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSimulate.mockReset()
  })

  it('should have correct initial state', () => {
    const { result } = renderHook(() => useSimulation())

    expect(result.current.result).toBeNull()
    expect(result.current.isSimulating).toBe(false)
    expect(result.current.error).toBeNull()
    expect(typeof result.current.simulate).toBe('function')
    expect(typeof result.current.reset).toBe('function')
  })

  it('should handle successful simulation with success result', async () => {
    const successResult: SimulationResult = {
      success: true,
      trace: { some: 'trace data' },
      parsedTrace: [{ from: '0x123', to: '0x456', depth: 0 }],
      chainId: 1,
    }

    mockSimulate.mockResolvedValue(successResult)

    const { result } = renderHook(() => useSimulation())

    const params = {
      rpcUrl: 'https://eth.llamarpc.com',
      payload: '0x123',
      fromAddress: '0xabc',
      toAddress: '0xdef',
    }

    // Execute simulation
    await act(async () => {
      await result.current.simulate(params)
    })

    await waitFor(
      () => {
        expect(result.current.isSimulating).toBe(false)
        expect(result.current.result).toEqual(successResult)
      },
      { timeout: 3000 }
    )

    expect(result.current.error).toBeNull()
    expect(mockSimulate).toHaveBeenCalledWith(
      expect.objectContaining({
        rpcUrl: params.rpcUrl,
        payload: params.payload,
        fromAddress: params.fromAddress,
        toAddress: params.toAddress,
        blockNumber: undefined,
        apiEtherscanUrl: undefined,
        etherscanUrl: undefined,
        etherscanApiKey: undefined,
      })
    )
    expect(toast.success).toHaveBeenCalledWith('Simulation Successful', {
      description: 'Transaction simulation completed successfully',
    })
  })

  it('should handle successful simulation with failed result', async () => {
    const failedResult: SimulationResult = {
      success: false,
      error: 'Transaction reverted',
      errorDetails: { message: 'Out of gas' },
    }

    mockSimulate.mockResolvedValue(failedResult)

    const { result } = renderHook(() => useSimulation())

    const params = {
      rpcUrl: 'https://eth.llamarpc.com',
      payload: '0x123',
      fromAddress: '0xabc',
      toAddress: '0xdef',
    }

    await act(async () => {
      await result.current.simulate(params)
    })

    await waitFor(
      () => {
        expect(result.current.isSimulating).toBe(false)
        expect(result.current.result).toEqual(failedResult)
      },
      { timeout: 3000 }
    )

    expect(toast.error).toHaveBeenCalledWith('Simulation Failed', {
      description: 'Transaction reverted',
    })
  })

  it('should handle service error during simulation', async () => {
    const error = new Error('Network error')
    mockSimulate.mockRejectedValue(error)

    const { result } = renderHook(() => useSimulation())

    const params = {
      rpcUrl: 'https://eth.llamarpc.com',
      payload: '0x123',
      fromAddress: '0xabc',
      toAddress: '0xdef',
    }

    await act(async () => {
      await result.current.simulate(params)
    })

    await waitFor(() => {
      expect(result.current.isSimulating).toBe(false)
      expect(result.current.error).toEqual(error)
    })
    expect(result.current.result).toEqual({
      success: false,
      error: 'Network error',
    })
    expect(toast.error).toHaveBeenCalledWith('Simulation Failed', {
      description: 'Network error',
    })
  })

  it('should handle non-Error exception during simulation', async () => {
    mockSimulate.mockRejectedValue('String error')

    const { result } = renderHook(() => useSimulation())

    const params = {
      rpcUrl: 'https://eth.llamarpc.com',
      payload: '0x123',
      fromAddress: '0xabc',
      toAddress: '0xdef',
    }

    await act(async () => {
      await result.current.simulate(params)
    })

    await waitFor(
      () => {
        expect(result.current.isSimulating).toBe(false)
        expect(result.current.error).toBeInstanceOf(Error)
      },
      { timeout: 3000 }
    )

    expect(result.current.error?.message).toBe('Unknown error occurred')
  })

  it('should cache service instance using useRef', async () => {
    const successResult: SimulationResult = {
      success: true,
      trace: {},
    }

    mockSimulate.mockResolvedValue(successResult)

    const { result } = renderHook(() => useSimulation())

    const params = {
      rpcUrl: 'https://eth.llamarpc.com',
      payload: '0x123',
      fromAddress: '0xabc',
      toAddress: '0xdef',
    }

    // First simulation
    await act(async () => {
      await result.current.simulate(params)
    })
    await waitFor(() => expect(result.current.isSimulating).toBe(false))

    // Second simulation
    await act(async () => {
      await result.current.simulate(params)
    })
    await waitFor(() => expect(result.current.isSimulating).toBe(false))

    // Service should only be created once
    expect(SimulationService).toHaveBeenCalledTimes(1)
    // But simulate should be called twice
    expect(mockSimulate).toHaveBeenCalledTimes(2)
  })

  it('should invoke success callback on successful simulation', async () => {
    const successResult: SimulationResult = {
      success: true,
      trace: {},
    }

    mockSimulate.mockResolvedValue(successResult)

    const onSuccess = vi.fn()
    const { result } = renderHook(() => useSimulation({ onSuccess }))

    const params = {
      rpcUrl: 'https://eth.llamarpc.com',
      payload: '0x123',
      fromAddress: '0xabc',
      toAddress: '0xdef',
    }

    await act(async () => {
      await result.current.simulate(params)
    })

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(successResult)
    })
  })

  it('should invoke error callback on failed simulation', async () => {
    const error = new Error('Simulation failed')
    mockSimulate.mockRejectedValue(error)

    const onError = vi.fn()
    const { result } = renderHook(() => useSimulation({ onError }))

    const params = {
      rpcUrl: 'https://eth.llamarpc.com',
      payload: '0x123',
      fromAddress: '0xabc',
      toAddress: '0xdef',
    }

    await act(async () => {
      await result.current.simulate(params)
    })

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error)
    })
  })

  it('should reset all state when reset is called', async () => {
    const successResult: SimulationResult = {
      success: true,
      trace: {},
    }

    mockSimulate.mockResolvedValue(successResult)

    const { result } = renderHook(() => useSimulation())

    const params = {
      rpcUrl: 'https://eth.llamarpc.com',
      payload: '0x123',
      fromAddress: '0xabc',
      toAddress: '0xdef',
    }

    // Execute simulation
    await act(async () => {
      await result.current.simulate(params)
    })

    await waitFor(
      () => {
        expect(result.current.isSimulating).toBe(false)
        expect(result.current.result).not.toBeNull()
      },
      { timeout: 3000 }
    )

    // Reset
    act(() => {
      result.current.reset()
    })

    expect(result.current.result).toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.isSimulating).toBe(false)
  })

  it('should clear previous state before new simulation', async () => {
    const firstResult: SimulationResult = {
      success: true,
      trace: { first: 'data' },
    }

    const secondResult: SimulationResult = {
      success: true,
      trace: { second: 'data' },
    }

    mockSimulate.mockResolvedValueOnce(firstResult).mockResolvedValueOnce(secondResult)

    const { result } = renderHook(() => useSimulation())

    const params = {
      rpcUrl: 'https://eth.llamarpc.com',
      payload: '0x123',
      fromAddress: '0xabc',
      toAddress: '0xdef',
    }

    // First simulation
    await act(async () => {
      await result.current.simulate(params)
    })
    await waitFor(
      () => {
        expect(result.current.isSimulating).toBe(false)
        expect(result.current.result).toEqual(firstResult)
      },
      { timeout: 3000 }
    )

    // Second simulation
    await act(async () => {
      await result.current.simulate(params)
    })

    await waitFor(
      () => {
        expect(result.current.result).toEqual(secondResult)
        expect(result.current.isSimulating).toBe(false)
      },
      { timeout: 3000 }
    )
  })

  it('should include optional parameters in simulation request', async () => {
    const successResult: SimulationResult = {
      success: true,
      trace: {},
    }

    mockSimulate.mockResolvedValue(successResult)

    const { result } = renderHook(() => useSimulation())

    const params = {
      rpcUrl: 'https://eth.llamarpc.com',
      payload: '0x123',
      fromAddress: '0xabc',
      toAddress: '0xdef',
      blockNumber: '12345',
      apiEtherscanUrl: 'https://api.etherscan.io',
      etherscanUrl: 'https://etherscan.io',
      etherscanApiKey: 'test-key',
    }

    await act(async () => {
      await result.current.simulate(params)
    })

    await waitFor(() => {
      expect(mockSimulate).toHaveBeenCalledWith(expect.objectContaining(params))
    })
  })

  it('should set isSimulating to true during simulation', async () => {
    const successResult: SimulationResult = {
      success: true,
      trace: {},
    }

    // Delay the resolution to test loading state
    mockSimulate.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(successResult), 50))
    )

    const { result } = renderHook(() => useSimulation())

    const params = {
      rpcUrl: 'https://eth.llamarpc.com',
      payload: '0x123',
      fromAddress: '0xabc',
      toAddress: '0xdef',
    }

    // Start simulation (don't await yet)
    let simulatePromise
    act(() => {
      simulatePromise = result.current.simulate(params)
    })

    // Should be simulating
    await waitFor(
      () => {
        expect(result.current.isSimulating).toBe(true)
      },
      { timeout: 100 }
    )

    // Wait for completion
    await act(async () => {
      await simulatePromise
    })

    // Wait for final state update
    await waitFor(
      () => {
        expect(result.current.isSimulating).toBe(false)
      },
      { timeout: 3000 }
    )
  })

  it('should log simulation data to console', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const successResult: SimulationResult = {
      success: true,
      trace: {},
    }

    mockSimulate.mockResolvedValue(successResult)

    const { result } = renderHook(() => useSimulation())

    const params = {
      rpcUrl: 'https://eth.llamarpc.com',
      payload: '0x123',
      fromAddress: '0xabc',
      toAddress: '0xdef',
    }

    await act(async () => {
      await result.current.simulate(params)
    })

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Simulating with data:', params)
    })

    consoleSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  it('should log error to console when simulation fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const error = new Error('Test error')
    mockSimulate.mockRejectedValue(error)

    const { result } = renderHook(() => useSimulation())

    const params = {
      rpcUrl: 'https://eth.llamarpc.com',
      payload: '0x123',
      fromAddress: '0xabc',
      toAddress: '0xdef',
    }

    await act(async () => {
      await result.current.simulate(params)
    })

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Simulation error:', error)
    })

    consoleErrorSpy.mockRestore()
  })
})
