import { useEffect } from 'react'
import type { UseFormSetValue, Path, PathValue } from 'react-hook-form'

const STORAGE_KEY = 'flashpoint-last-simulation-form'

export interface PersistedFormData {
  rpcUrl: string
  payload: string
  fromAddress: string
  toAddress: string
  blockNumber?: string
  apiEtherscanUrl?: string
  etherscanUrl?: string
  etherscanApiKey?: string
  timestamp?: number
}

/**
 * Hook to persist and restore form data from localStorage
 * Automatically saves form data on successful simulation
 * Restores form data on component mount (page reload)
 */
export function useFormPersistence<T extends PersistedFormData>(setValue: UseFormSetValue<T>) {
  // Restore form data from localStorage on mount
  useEffect(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY)
      if (savedData) {
        const parsed = JSON.parse(savedData) as PersistedFormData
        console.log('Restoring form data from localStorage')

        // Restore all fields with proper typing
        if (parsed.rpcUrl) setValue('rpcUrl' as Path<T>, parsed.rpcUrl as PathValue<T, Path<T>>)
        if (parsed.payload) setValue('payload' as Path<T>, parsed.payload as PathValue<T, Path<T>>)
        if (parsed.fromAddress)
          setValue('fromAddress' as Path<T>, parsed.fromAddress as PathValue<T, Path<T>>)
        if (parsed.toAddress)
          setValue('toAddress' as Path<T>, parsed.toAddress as PathValue<T, Path<T>>)
        if (parsed.blockNumber)
          setValue('blockNumber' as Path<T>, parsed.blockNumber as PathValue<T, Path<T>>)
        if (parsed.apiEtherscanUrl)
          setValue('apiEtherscanUrl' as Path<T>, parsed.apiEtherscanUrl as PathValue<T, Path<T>>)
        if (parsed.etherscanUrl)
          setValue('etherscanUrl' as Path<T>, parsed.etherscanUrl as PathValue<T, Path<T>>)
        if (parsed.etherscanApiKey)
          setValue('etherscanApiKey' as Path<T>, parsed.etherscanApiKey as PathValue<T, Path<T>>)
      }
    } catch (error) {
      console.warn('Failed to restore form data from localStorage:', error)
      // Clear corrupted data
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [setValue])

  // Save form data to localStorage
  const saveFormData = (data: PersistedFormData) => {
    try {
      const dataToSave: PersistedFormData = {
        ...data,
        timestamp: Date.now(),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
      console.log('Saved form data to localStorage')
    } catch (error) {
      console.warn('Failed to save form data to localStorage:', error)
    }
  }

  // Clear persisted form data
  const clearFormData = () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
      console.log('Cleared form data from localStorage')
    } catch (error) {
      console.warn('Failed to clear form data from localStorage:', error)
    }
  }

  return {
    saveFormData,
    clearFormData,
  }
}
