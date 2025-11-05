import type { SimulationResult } from '@/lib/types'
import type { ContainerSize } from '@/components/Settings'

// ============================================================================
// Simulation Hook Types
// ============================================================================

export interface SimulationRequest {
  rpcUrl: string
  payload: string
  fromAddress: string
  toAddress: string
  blockNumber?: string
  apiEtherscanUrl?: string
  etherscanUrl?: string
  etherscanApiKey?: string
}

export interface UseSimulationOptions {
  onSuccess?: (result: SimulationResult) => void
  onError?: (error: Error) => void
}

export interface UseSimulationReturn {
  simulate: (params: SimulationRequest) => Promise<void>
  result: SimulationResult | null
  isSimulating: boolean
  error: Error | null
  reset: () => void
}

// ============================================================================
// Share Transaction Hook Types
// ============================================================================

export interface ShareData {
  payload: string
  fromAddress: string
  toAddress: string
  blockNumber?: string
  apiEtherscanUrl?: string
  etherscanUrl?: string
  etherscanApiKey?: string
  result?: SimulationResult
}

export interface UseShareTransactionOptions {
  onSuccess?: (shareUrl: string, privateBinUrl: string) => void
  onError?: (error: Error) => void
}

export interface UseShareTransactionReturn {
  share: (data: ShareData) => Promise<void>
  isSharing: boolean
  shareUrl: string
  privateBinUrl: string
  error: Error | null
  reset: () => void
}

// ============================================================================
// Load Shared Transaction Hook Types
// ============================================================================

export interface LoadedSharedData {
  payload: string
  fromAddress: string
  toAddress: string
  blockNumber?: string
  apiEtherscanUrl?: string
  etherscanUrl?: string
  // Note: etherscanApiKey is not included (not shared for security)
}

export interface UseLoadSharedTransactionOptions {
  onSuccess?: (data: LoadedSharedData) => void
  onError?: (error: Error) => void
}

export interface UseLoadSharedTransactionReturn {
  isLoading: boolean
  data: LoadedSharedData | null
  simulationResult: SimulationResult | null
  error: Error | null
}

// ============================================================================
// Clipboard Form Hook Types
// ============================================================================

export interface FormData {
  rpcUrl: string
  payload: string
  fromAddress: string
  toAddress: string
  blockNumber?: string
  apiEtherscanUrl?: string
  etherscanUrl?: string
  etherscanApiKey?: string
}

export interface UseClipboardFormOptions {
  onCopySuccess?: () => void
  onCopyError?: (error: Error) => void
  onPasteSuccess?: (data: FormData) => void
  onPasteError?: (error: Error) => void
}

export interface UseClipboardFormReturn {
  copyToClipboard: (data: FormData) => Promise<void>
  pasteFromClipboard: () => Promise<FormData | null>
  isCopying: boolean
  isPasting: boolean
}

// ============================================================================
// Container Size Hook Types
// ============================================================================

export interface UseContainerSizeReturn {
  containerSize: ContainerSize
  setContainerSize: (size: ContainerSize) => void
  containerWidthClass: string
}
