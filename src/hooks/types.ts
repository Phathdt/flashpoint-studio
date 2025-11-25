import type { SimulationResult, ApiExecutionStrategy } from '@/lib/types'
import type { ContainerSize } from '@/components/Settings'
import { InputMode } from '@/lib/constants'

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
  apiExecutionStrategy?: ApiExecutionStrategy
  apiRateLimit?: number
  inputMode?: InputMode
  txHash?: string
}

export interface SimulationProgress {
  step: number
  totalSteps: number
  message: string
}

export interface UseSimulationOptions {
  onSuccess?: (result: SimulationResult) => void
  onError?: (error: Error) => void
  onProgress?: (progress: SimulationProgress) => void
}

export interface UseSimulationReturn {
  simulate: (params: SimulationRequest) => Promise<void>
  result: SimulationResult | null
  isSimulating: boolean
  progress: SimulationProgress | null
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
  inputMode?: InputMode
  txHash?: string
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
  inputMode?: InputMode
  txHash?: string
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
  inputMode?: InputMode
  txHash?: string
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

// ============================================================================
// Transaction Fetch Hook Types
// ============================================================================

export interface FetchedTransactionData {
  from: string
  to: string | null
  data: string
  blockNumber: number | null
  value: bigint
  gasLimit: bigint
  gasPrice: bigint | null
  type: number
  chainId: bigint
  hash: string
  nonce: number
}

export interface UseTransactionFetchOptions {
  onSuccess?: (data: FetchedTransactionData) => void
  onError?: (error: Error) => void
}

export interface UseTransactionFetchReturn {
  fetchTransaction: (rpcUrl: string, txHash: string) => Promise<void>
  data: FetchedTransactionData | null
  isFetching: boolean
  error: string | null
  reset: () => void
}

export interface UseTransactionAutoFetchOptions {
  enabled: boolean
  rpcUrl: string
  txHash: string
  debounceMs?: number
  onSuccess?: (data: FetchedTransactionData) => void
  onError?: (error: Error) => void
}

// ============================================================================
// Form Population Types
// ============================================================================

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

// ============================================================================
// Input Mode Manager Types
// ============================================================================

export interface UseInputModeManagerReturn {
  inputMode: InputMode
  setInputMode: (mode: InputMode) => void
}
