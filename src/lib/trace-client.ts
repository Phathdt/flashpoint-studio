import { ethers } from 'ethers'
import type { CallFrame, TraceConfig } from './types'

/**
 * Client for executing debug_traceCall RPC method
 */
export class TraceClient {
  private provider: ethers.JsonRpcProvider

  constructor(rpcUrl: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl)
  }

  /**
   * Check if the RPC endpoint supports debug_traceCall
   */
  async supportsTracing(): Promise<boolean> {
    try {
      // Try a minimal trace call to check support
      await this.provider.send('debug_traceCall', [
        {
          to: '0x0000000000000000000000000000000000000000',
          data: '0x',
        },
        'latest',
        { tracer: 'callTracer' },
      ])
      return true
    } catch (error) {
      if (error instanceof Error) {
        // Check for method not found errors
        if (
          error.message.includes('method not found') ||
          error.message.includes('not supported') ||
          error.message.includes('does not exist')
        ) {
          console.debug('RPC does not support debug_traceCall')
          return false
        }
        // Other errors might be valid (e.g., invalid params), so we assume support
        console.debug(`Trace support check inconclusive: ${error.message}`)
      }
      return true
    }
  }

  /**
   * Execute debug_traceCall and return the call frame hierarchy
   */
  async traceCall(
    tx: { to: string; from: string; data: string; value?: string },
    blockTag: string = 'latest',
    config: TraceConfig = {}
  ): Promise<CallFrame> {
    try {
      console.debug('Executing debug_traceCall...')

      const timeout = config.timeout || 10000 // Default 10 seconds

      // Create a promise that rejects after timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Trace execution timeout')), timeout)
      })

      // Race between trace execution and timeout
      const tracePromise = this.provider.send('debug_traceCall', [
        {
          to: tx.to,
          from: tx.from,
          data: tx.data,
          value: tx.value || '0x0',
        },
        blockTag,
        {
          tracer: 'callTracer',
          tracerConfig: {
            onlyTopCall: false, // Include all nested calls
          },
        },
      ])

      const result = await Promise.race([tracePromise, timeoutPromise])

      console.debug('Trace execution completed')
      return result as CallFrame
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Trace execution failed: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Execute trace with automatic fallback
   * Returns null if tracing is not supported or fails
   */
  async traceCallSafe(
    tx: { to: string; from: string; data: string; value?: string },
    blockTag: string = 'latest',
    config: TraceConfig = {}
  ): Promise<CallFrame | null> {
    try {
      const supportsTrace = await this.supportsTracing()
      if (!supportsTrace) {
        console.debug('Tracing not supported by RPC, skipping trace')
        return null
      }

      return await this.traceCall(tx, blockTag, config)
    } catch (error) {
      console.warn('Trace execution failed, continuing without trace')
      console.debug(`Trace error: ${error instanceof Error ? error.message : String(error)}`)
      return null
    }
  }

  /**
   * Get the provider instance
   */
  getProvider(): ethers.JsonRpcProvider {
    return this.provider
  }
}
