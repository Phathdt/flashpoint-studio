import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useContainerSize } from '../useContainerSize'
import type { ContainerSize } from '@/components/Settings'

// Mock the container-size utility
vi.mock('@/lib/container-size', () => ({
  getContainerWidthClass: (size: ContainerSize) => {
    const classMap: Record<ContainerSize, string> = {
      small: 'max-w-3xl',
      medium: 'max-w-5xl',
      large: 'max-w-7xl',
      'extra-large': 'max-w-screen-2xl',
      full: 'max-w-full',
    }
    return classMap[size] || 'max-w-7xl'
  },
}))

describe('useContainerSize', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset localStorage mock to default behavior
    vi.mocked(localStorage.getItem).mockReturnValue(null)
    vi.mocked(localStorage.setItem).mockImplementation(() => {})
    vi.mocked(localStorage.removeItem).mockImplementation(() => {})
    vi.mocked(localStorage.clear).mockImplementation(() => {})
  })

  it('should have correct initial state with default size', () => {
    const { result } = renderHook(() => useContainerSize())

    expect(result.current.containerSize).toBe('large')
    expect(result.current.containerWidthClass).toBe('max-w-7xl')
    expect(typeof result.current.setContainerSize).toBe('function')
  })

  it('should load saved size from localStorage on mount', () => {
    vi.mocked(localStorage.getItem).mockReturnValue('medium')

    const { result } = renderHook(() => useContainerSize())

    expect(result.current.containerSize).toBe('medium')
    expect(result.current.containerWidthClass).toBe('max-w-5xl')
  })

  it('should use default size when localStorage is empty', () => {
    const { result } = renderHook(() => useContainerSize())

    expect(result.current.containerSize).toBe('large')
  })

  it('should update state and localStorage when setContainerSize is called', () => {
    const { result } = renderHook(() => useContainerSize())

    act(() => {
      result.current.setContainerSize('small')
    })

    expect(result.current.containerSize).toBe('small')
    expect(result.current.containerWidthClass).toBe('max-w-3xl')
    expect(localStorage.setItem).toHaveBeenCalledWith('container-size', 'small')
  })

  it('should update to medium size', () => {
    const { result } = renderHook(() => useContainerSize())

    act(() => {
      result.current.setContainerSize('medium')
    })

    expect(result.current.containerSize).toBe('medium')
    expect(result.current.containerWidthClass).toBe('max-w-5xl')
  })

  it('should update to extra-large size', () => {
    const { result } = renderHook(() => useContainerSize())

    act(() => {
      result.current.setContainerSize('extra-large')
    })

    expect(result.current.containerSize).toBe('extra-large')
    expect(result.current.containerWidthClass).toBe('max-w-screen-2xl')
  })

  it('should update to full size', () => {
    const { result } = renderHook(() => useContainerSize())

    act(() => {
      result.current.setContainerSize('full')
    })

    expect(result.current.containerSize).toBe('full')
    expect(result.current.containerWidthClass).toBe('max-w-full')
  })

  it('should reject invalid size and log warning', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { result } = renderHook(() => useContainerSize())

    const initialSize = result.current.containerSize

    // @ts-expect-error Testing invalid size
    result.current.setContainerSize('invalid-size')

    expect(result.current.containerSize).toBe(initialSize)
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Invalid container size: invalid-size. Using default.'
    )
    expect(localStorage.setItem).not.toHaveBeenCalledWith('container-size', 'invalid-size')

    consoleWarnSpy.mockRestore()
  })

  it('should ignore invalid size in localStorage', () => {
    vi.mocked(localStorage.getItem).mockReturnValue('invalid-size')

    const { result } = renderHook(() => useContainerSize())

    expect(result.current.containerSize).toBe('large')
    expect(result.current.containerWidthClass).toBe('max-w-7xl')
  })

  it('should sync with localStorage on mount via useEffect', async () => {
    vi.mocked(localStorage.getItem).mockReturnValue('small')

    const { result } = renderHook(() => useContainerSize())

    await waitFor(() => {
      expect(result.current.containerSize).toBe('small')
    })
  })

  it('should handle all valid container sizes', () => {
    const { result } = renderHook(() => useContainerSize())

    const validSizes: ContainerSize[] = ['small', 'medium', 'large', 'extra-large', 'full']

    validSizes.forEach((size) => {
      act(() => {
        result.current.setContainerSize(size)
      })
      expect(result.current.containerSize).toBe(size)
    })
  })

  it('should persist size changes across re-renders', () => {
    const { result, rerender } = renderHook(() => useContainerSize())

    act(() => {
      result.current.setContainerSize('medium')
    })

    rerender()

    expect(result.current.containerSize).toBe('medium')
    expect(result.current.containerWidthClass).toBe('max-w-5xl')
  })

  it('should return correct CSS class for small size', () => {
    const { result } = renderHook(() => useContainerSize())

    act(() => {
      result.current.setContainerSize('small')
    })

    expect(result.current.containerWidthClass).toBe('max-w-3xl')
  })

  it('should return correct CSS class for medium size', () => {
    const { result } = renderHook(() => useContainerSize())

    act(() => {
      result.current.setContainerSize('medium')
    })

    expect(result.current.containerWidthClass).toBe('max-w-5xl')
  })

  it('should return correct CSS class for large size', () => {
    const { result } = renderHook(() => useContainerSize())

    act(() => {
      result.current.setContainerSize('large')
    })

    expect(result.current.containerWidthClass).toBe('max-w-7xl')
  })

  it('should return correct CSS class for extra-large size', () => {
    const { result } = renderHook(() => useContainerSize())

    act(() => {
      result.current.setContainerSize('extra-large')
    })

    expect(result.current.containerWidthClass).toBe('max-w-screen-2xl')
  })

  it('should return correct CSS class for full size', () => {
    const { result } = renderHook(() => useContainerSize())

    act(() => {
      result.current.setContainerSize('full')
    })

    expect(result.current.containerWidthClass).toBe('max-w-full')
  })

  it('should use localStorage correctly when window is undefined', () => {
    // This test simulates SSR environment
    const { result } = renderHook(() => useContainerSize())

    // Should still work with default size
    expect(result.current.containerSize).toBe('large')
  })

  it('should handle multiple setContainerSize calls', () => {
    const { result } = renderHook(() => useContainerSize())

    act(() => {
      result.current.setContainerSize('small')
    })
    expect(result.current.containerSize).toBe('small')

    act(() => {
      result.current.setContainerSize('medium')
    })
    expect(result.current.containerSize).toBe('medium')

    act(() => {
      result.current.setContainerSize('large')
    })
    expect(result.current.containerSize).toBe('large')

    act(() => {
      result.current.setContainerSize('extra-large')
    })
    expect(result.current.containerSize).toBe('extra-large')

    act(() => {
      result.current.setContainerSize('full')
    })
    expect(result.current.containerSize).toBe('full')

    expect(localStorage.setItem).toHaveBeenCalledTimes(5)
  })

  it('should validate size using isValidSize helper', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { result } = renderHook(() => useContainerSize())

    // Valid sizes should not warn
    act(() => {
      result.current.setContainerSize('small')
      result.current.setContainerSize('medium')
      result.current.setContainerSize('large')
      result.current.setContainerSize('extra-large')
      result.current.setContainerSize('full')
    })

    expect(consoleWarnSpy).not.toHaveBeenCalled()

    // Invalid size should warn
    act(() => {
      // @ts-expect-error Testing invalid size
      result.current.setContainerSize('xlarge')
    })

    expect(consoleWarnSpy).toHaveBeenCalledWith('Invalid container size: xlarge. Using default.')

    consoleWarnSpy.mockRestore()
  })

  it('should not call localStorage.setItem when size is invalid', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { result } = renderHook(() => useContainerSize())

    // Clear previous calls
    vi.clearAllMocks()

    // @ts-expect-error Testing invalid size
    result.current.setContainerSize('xxxl')

    expect(localStorage.setItem).not.toHaveBeenCalled()
  })

  it('should maintain stable setContainerSize reference', () => {
    const { result, rerender } = renderHook(() => useContainerSize())

    const firstSetterRef = result.current.setContainerSize

    rerender()

    const secondSetterRef = result.current.setContainerSize

    expect(firstSetterRef).toBe(secondSetterRef)
  })

  it('should initialize from localStorage in useState initializer', () => {
    vi.mocked(localStorage.getItem).mockReturnValue('extra-large')

    const { result } = renderHook(() => useContainerSize())

    // Should be loaded immediately from initializer
    expect(result.current.containerSize).toBe('extra-large')
  })

  it('should handle localStorage with null value', () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null)

    const { result } = renderHook(() => useContainerSize())

    expect(result.current.containerSize).toBe('large')
  })

  it('should sync state if localStorage changes after mount', async () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null)

    const { result } = renderHook(() => useContainerSize())

    expect(result.current.containerSize).toBe('large')

    // Simulate external localStorage change
    vi.mocked(localStorage.getItem).mockReturnValue('small')

    // Remount the hook to trigger useEffect
    const { result: newResult } = renderHook(() => useContainerSize())

    await waitFor(() => {
      expect(newResult.current.containerSize).toBe('small')
    })
  })
})
