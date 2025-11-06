/**
 * Call frame structure returned by debug_traceCall with callTracer
 */
export interface CallFrame {
  type: 'CALL' | 'DELEGATECALL' | 'STATICCALL' | 'CREATE' | 'CREATE2' | 'SELFDESTRUCT'
  from: string
  to?: string
  value?: string
  gas: string
  gasUsed: string
  input: string
  output?: string
  error?: string
  revertReason?: string
  calls?: CallFrame[]
}

/**
 * Configuration for trace execution
 */
export interface TraceConfig {
  timeout?: number // Timeout in milliseconds
}

/**
 * API execution strategy for fetching multiple contracts
 */
export type ApiExecutionStrategy = 'parallel' | 'sequential'

/**
 * Retry configuration for API requests
 */
export interface RetryConfig {
  maxRetries: number // Maximum number of retry attempts
  timeout: number // Timeout in milliseconds for each request
}

/**
 * Simulation request parameters
 */
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
  onProgress?: (step: number, totalSteps: number, message: string) => void
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Represents a token or ETH transfer detected in trace
 */
export interface TokenTransfer {
  type: 'erc20' | 'native'
  from: string
  to: string
  amount: bigint
  tokenAddress?: string // Contract address for ERC-20
  tokenName?: string
  tokenSymbol?: string
  tokenDecimals?: number
  formattedAmount?: string
  callFrameIndex?: number
}

/**
 * Token metadata from ERC-20 contract
 */
export interface TokenMetadata {
  address: string
  name: string
  symbol: string
  decimals: number
}

/**
 * Simulation result
 */
export interface SimulationResult {
  success: boolean
  trace?: CallFrame
  parsedTrace?: {
    frame: any
    stats: any
  }
  contractNames?: Map<string, string>
  chainId?: number
  etherscanUrl?: string
  allTransfers?: TokenTransfer[]
  tokenMetadata?: Map<string, TokenMetadata>
  error?: string
  errorDetails?: {
    type: string
    name?: string
    reason?: string
    args?: unknown[]
    signature?: string
  }
}
