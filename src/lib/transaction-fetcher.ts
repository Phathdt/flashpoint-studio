import { ethers } from 'ethers'
import type { FetchedTransactionData } from '@/hooks/types'

export class TransactionFetcher {
  private provider: ethers.JsonRpcProvider

  constructor(rpcUrl: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl)
  }

  /**
   * Validate transaction hash format
   */
  static isValidTransactionHash(hash: string): boolean {
    return /^0x[a-fA-F0-9]{64}$/.test(hash)
  }

  /**
   * Fetch transaction details by hash
   */
  async fetchTransaction(txHash: string): Promise<FetchedTransactionData> {
    // Validate hash format
    if (!TransactionFetcher.isValidTransactionHash(txHash)) {
      throw new Error('Invalid transaction hash format')
    }

    console.log(`Fetching transaction: ${txHash}`)

    try {
      // Fetch transaction from blockchain
      const tx = await this.provider.getTransaction(txHash)

      if (!tx) {
        throw new Error('Transaction not found. It may be pending or not exist.')
      }

      // Check if transaction is mined
      if (!tx.blockNumber) {
        throw new Error('Transaction is still pending. Please wait for confirmation.')
      }

      // Validate required fields
      if (!tx.from) {
        throw new Error('Transaction missing sender address')
      }

      // Handle contract creation (to is null)
      if (!tx.to) {
        console.warn('Transaction is a contract creation (to address is null)')
      }

      return {
        from: tx.from,
        to: tx.to,
        data: tx.data,
        blockNumber: tx.blockNumber,
        value: tx.value,
        gasLimit: tx.gasLimit,
        gasPrice: tx.gasPrice,
        type: tx.type || 0,
        chainId: tx.chainId,
        hash: tx.hash,
        nonce: tx.nonce,
      }
    } catch (error) {
      if (error instanceof Error) {
        // Check for specific RPC errors
        if (error.message.includes('unknown transaction')) {
          throw new Error('Transaction not found on this network')
        }
        if (error.message.includes('network timeout')) {
          throw new Error('Network timeout. Please check your RPC connection.')
        }
        if (error.message.includes('invalid response')) {
          throw new Error('Invalid response from RPC. Please check your RPC URL.')
        }
        // Re-throw with context
        throw error
      }
      throw new Error('Failed to fetch transaction')
    }
  }

  /**
   * Get the recommended block number for simulation
   * Uses block number - 1 to ensure state is available
   */
  static getSimulationBlockNumber(txBlockNumber: number | null): string {
    if (!txBlockNumber || txBlockNumber <= 0) {
      return 'latest'
    }
    // Use previous block to ensure state is available
    const simulationBlock = txBlockNumber - 1
    return `0x${simulationBlock.toString(16)}`
  }

  /**
   * Format transaction data for display
   */
  static formatTransactionData(data: FetchedTransactionData): {
    from: string
    to: string
    payload: string
    blockNumber: string
  } {
    return {
      from: data.from,
      to: data.to || '0x0000000000000000000000000000000000000000', // Handle contract creation
      payload: data.data,
      blockNumber: this.getSimulationBlockNumber(data.blockNumber),
    }
  }

  /**
   * Get provider instance (for testing)
   */
  getProvider(): ethers.JsonRpcProvider {
    return this.provider
  }
}
