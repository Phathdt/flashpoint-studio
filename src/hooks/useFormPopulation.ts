import type { UseFormSetValue, Path, PathValue } from 'react-hook-form'
import { InputMode } from '@/lib/constants'

/**
 * Data structure for form population
 * Supports both manual and transaction hash modes
 */
export interface PopulationData {
  inputMode?: InputMode
  rpcUrl?: string
  txHash?: string
  payload?: string
  fromAddress?: string
  toAddress?: string
  blockNumber?: string
  apiEtherscanUrl?: string
  etherscanUrl?: string
  etherscanApiKey?: string
}

/**
 * Utility function to populate form fields based on input mode
 * Handles both manual and transaction hash modes consistently
 *
 * @param setValue - React Hook Form setValue function
 * @param data - Data to populate into the form
 * @param mode - Current input mode (manual or txHash)
 */
export function populateFormFields<T extends Record<string, unknown>>(
  setValue: UseFormSetValue<T>,
  data: PopulationData,
  mode: InputMode
): void {
  // Set common fields
  if (data.rpcUrl) setValue('rpcUrl' as Path<T>, data.rpcUrl as PathValue<T, Path<T>>)
  if (data.blockNumber)
    setValue('blockNumber' as Path<T>, data.blockNumber as PathValue<T, Path<T>>)
  if (data.apiEtherscanUrl)
    setValue('apiEtherscanUrl' as Path<T>, data.apiEtherscanUrl as PathValue<T, Path<T>>)
  if (data.etherscanUrl)
    setValue('etherscanUrl' as Path<T>, data.etherscanUrl as PathValue<T, Path<T>>)
  if (data.etherscanApiKey)
    setValue('etherscanApiKey' as Path<T>, data.etherscanApiKey as PathValue<T, Path<T>>)

  // Set mode-specific fields
  if (mode === InputMode.TX_HASH && data.txHash) {
    // Transaction hash mode - set txHash (will trigger auto-fetch)
    setValue('txHash' as Path<T>, data.txHash as PathValue<T, Path<T>>)
  } else {
    // Manual mode - set manual fields
    if (data.fromAddress)
      setValue('fromAddress' as Path<T>, data.fromAddress as PathValue<T, Path<T>>)
    if (data.toAddress) setValue('toAddress' as Path<T>, data.toAddress as PathValue<T, Path<T>>)
    if (data.payload) setValue('payload' as Path<T>, data.payload as PathValue<T, Path<T>>)
  }
}
