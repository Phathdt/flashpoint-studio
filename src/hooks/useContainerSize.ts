import { useState, useEffect, useCallback } from 'react'
import { getContainerWidthClass } from '@/lib/container-size'
import type { ContainerSize } from '@/components/Settings'
import type { UseContainerSizeReturn } from './types'

const STORAGE_KEY = 'container-size'
const DEFAULT_SIZE: ContainerSize = 'large'

/**
 * Custom hook for managing container size preference
 *
 * Handles:
 * - Loading size preference from localStorage
 * - Saving size preference to localStorage
 * - Providing Tailwind CSS class for container width
 * - Default size fallback if no preference is saved
 *
 * @returns Container size state, setter, and corresponding CSS class
 *
 * @example
 * ```tsx
 * const { containerSize, setContainerSize, containerWidthClass } = useContainerSize()
 *
 * return (
 *   <div className={`container mx-auto ${containerWidthClass}`}>
 *     <Settings onSizeChange={setContainerSize} />
 *     <!-- content -->
 *   </div>
 * )
 * ```
 */
export function useContainerSize(): UseContainerSizeReturn {
  const [containerSize, setContainerSizeState] = useState<ContainerSize>(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      const savedSize = localStorage.getItem(STORAGE_KEY) as ContainerSize | null
      if (savedSize && isValidSize(savedSize)) {
        return savedSize
      }
    }
    return DEFAULT_SIZE
  })

  // Sync with localStorage on mount (intentionally runs once)
  useEffect(() => {
    const savedSize = localStorage.getItem(STORAGE_KEY) as ContainerSize | null
    if (savedSize && isValidSize(savedSize)) {
      setContainerSizeState(savedSize)
    }
  }, [])

  const setContainerSize = useCallback((size: ContainerSize) => {
    if (!isValidSize(size)) {
      console.warn(`Invalid container size: ${size}. Using default.`)
      return
    }

    setContainerSizeState(size)
    localStorage.setItem(STORAGE_KEY, size)
  }, [])

  const containerWidthClass = getContainerWidthClass(containerSize)

  return {
    containerSize,
    setContainerSize,
    containerWidthClass,
  }
}

/**
 * Validates if a string is a valid ContainerSize
 */
function isValidSize(size: string): size is ContainerSize {
  return ['small', 'medium', 'large', 'extra-large', 'full'].includes(size)
}
