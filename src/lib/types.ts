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
 * Simulation request parameters
 */
export interface SimulationRequest {
  rpcUrl: string
  payload: string
  fromAddress: string
  toAddress: string
  apiEtherscanUrl?: string
  etherscanUrl?: string
  etherscanApiKey?: string
}

/* eslint-disable @typescript-eslint/no-explicit-any */

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
  error?: string
  errorDetails?: {
    type: string
    name?: string
    reason?: string
    args?: unknown[]
    signature?: string
  }
}
