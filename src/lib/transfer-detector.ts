import { ethers } from 'ethers'
import type { ParsedCallFrame } from './trace-parser'
import type { TokenTransfer, TokenMetadata } from './types'
import { TokenMetadataClient } from './token-metadata-client'

/**
 * ERC-20 function selectors
 */
const TRANSFER_SELECTOR = '0xa9059cbb' // transfer(address,uint256)
const TRANSFER_FROM_SELECTOR = '0x23b872dd' // transferFrom(address,address,uint256)

/**
 * Service for detecting token transfers in transaction traces
 */
export class TransferDetector {
  private tokenMetadataClient: TokenMetadataClient

  constructor(provider: ethers.JsonRpcProvider, chainId: number) {
    this.tokenMetadataClient = new TokenMetadataClient(provider, chainId)
  }

  /**
   * Format token amount with decimals
   */
  private formatTokenAmount(amount: bigint, decimals: number, maxDecimals: number = 6): string {
    try {
      const divisor = BigInt(10 ** decimals)
      const integerPart = amount / divisor
      const fractionalPart = amount % divisor

      if (fractionalPart === 0n) {
        return integerPart.toString()
      }

      const fractionalStr = fractionalPart.toString().padStart(decimals, '0')
      const trimmed = fractionalStr.replace(/0+$/, '').slice(0, maxDecimals)

      return trimmed ? `${integerPart}.${trimmed}` : integerPart.toString()
    } catch (error) {
      console.warn('Failed to format token amount:', error)
      return amount.toString()
    }
  }

  /**
   * Check if a call frame is an ERC-20 transfer() call
   */
  private isTransferCall(frame: ParsedCallFrame): boolean {
    return frame.input.startsWith(TRANSFER_SELECTOR)
  }

  /**
   * Check if a call frame is an ERC-20 transferFrom() call
   */
  private isTransferFromCall(frame: ParsedCallFrame): boolean {
    return frame.input.startsWith(TRANSFER_FROM_SELECTOR)
  }

  /**
   * Parse transfer() call: transfer(address to, uint256 amount)
   */
  private parseTransferCall(frame: ParsedCallFrame): TokenTransfer | null {
    try {
      if (!frame.decodedInput || frame.decodedInput.length < 2) {
        return null
      }

      const to = frame.decodedInput[0] as string
      const amount = BigInt(frame.decodedInput[1] as bigint)

      return {
        type: 'erc20',
        from: frame.from,
        to,
        amount,
        tokenAddress: frame.to,
      }
    } catch (error) {
      console.warn('Failed to parse transfer() call:', error)
      return null
    }
  }

  /**
   * Parse transferFrom() call: transferFrom(address from, address to, uint256 amount)
   */
  private parseTransferFromCall(frame: ParsedCallFrame): TokenTransfer | null {
    try {
      if (!frame.decodedInput || frame.decodedInput.length < 3) {
        return null
      }

      const from = frame.decodedInput[0] as string
      const to = frame.decodedInput[1] as string
      const amount = BigInt(frame.decodedInput[2] as bigint)

      return {
        type: 'erc20',
        from,
        to,
        amount,
        tokenAddress: frame.to,
      }
    } catch (error) {
      console.warn('Failed to parse transferFrom() call:', error)
      return null
    }
  }

  /**
   * Traverse call frame tree to detect all transfers
   */
  private traverseFrame(
    frame: ParsedCallFrame,
    transfers: TokenTransfer[],
    tokenAddresses: Set<string>,
    parentFrame?: ParsedCallFrame
  ): void {
    // For DELEGATECALL, use the parent's context (the actual caller)
    // because DELEGATECALL executes in the caller's context
    const isDelegateCall = frame.type === 'DELEGATECALL'
    const actualFrom = isDelegateCall && parentFrame ? parentFrame.from : frame.from

    // Detect native ETH transfer (value > 0)
    // Skip for DELEGATECALL as value transfers happen at parent level
    if (frame.value > 0n && !isDelegateCall) {
      transfers.push({
        type: 'native',
        from: actualFrom,
        to: frame.to,
        amount: frame.value,
        tokenSymbol: 'ETH',
        tokenDecimals: 18,
        formattedAmount: this.formatTokenAmount(frame.value, 18),
      })
    }

    // Detect ERC-20 transfer()
    if (this.isTransferCall(frame)) {
      const transfer = this.parseTransferCall(frame)
      if (transfer && transfer.tokenAddress) {
        // For DELEGATECALL, override the 'from' with actual caller
        if (isDelegateCall && parentFrame) {
          transfer.from = parentFrame.from
        }
        transfers.push(transfer)
        tokenAddresses.add(transfer.tokenAddress.toLowerCase())
      }
    }

    // Detect ERC-20 transferFrom()
    if (this.isTransferFromCall(frame)) {
      const transfer = this.parseTransferFromCall(frame)
      if (transfer && transfer.tokenAddress) {
        // For DELEGATECALL, override the 'from' with actual caller
        if (isDelegateCall && parentFrame) {
          transfer.from = parentFrame.from
        }
        transfers.push(transfer)
        tokenAddresses.add(transfer.tokenAddress.toLowerCase())
      }
    }

    // Recursively process nested calls, passing current frame as parent
    for (const call of frame.calls) {
      this.traverseFrame(call, transfers, tokenAddresses, frame)
    }
  }

  /**
   * Detect all transfers in a transaction trace
   */
  async detectTransfers(frame: ParsedCallFrame): Promise<{
    transfers: TokenTransfer[]
    tokenMetadata: Map<string, TokenMetadata>
  }> {
    const transfers: TokenTransfer[] = []
    const tokenAddresses = new Set<string>()

    // Traverse the call frame tree to find all transfers
    this.traverseFrame(frame, transfers, tokenAddresses)

    console.log(`Detected ${transfers.length} transfer(s)`)

    // Fetch token metadata for all ERC-20 tokens
    let tokenMetadata = new Map<string, TokenMetadata>()
    if (tokenAddresses.size > 0) {
      tokenMetadata = await this.tokenMetadataClient.fetchMultipleTokenMetadata(
        Array.from(tokenAddresses)
      )
    }

    // Enrich transfers with token metadata
    const enrichedTransfers = transfers.map((transfer) => {
      if (transfer.type === 'erc20' && transfer.tokenAddress) {
        const metadata = tokenMetadata.get(transfer.tokenAddress.toLowerCase())
        if (metadata) {
          return {
            ...transfer,
            tokenName: metadata.name,
            tokenSymbol: metadata.symbol,
            tokenDecimals: metadata.decimals,
            formattedAmount: this.formatTokenAmount(transfer.amount, metadata.decimals),
          }
        }
      }
      return transfer
    })

    // Deduplicate transfers (proxy/implementation can cause duplicates)
    const deduplicatedTransfers = this.deduplicateTransfers(enrichedTransfers)

    return {
      transfers: deduplicatedTransfers,
      tokenMetadata,
    }
  }

  /**
   * Deduplicate transfers that represent the same actual transfer
   * (e.g., proxy delegate calls to implementation create duplicates)
   *
   * When a proxy delegates to implementation:
   * - Both proxy and implementation addresses appear in the trace
   * - Same from/to/amount but different token addresses
   * - We keep the one with valid metadata (token symbol)
   */
  private deduplicateTransfers(transfers: TokenTransfer[]): TokenTransfer[] {
    const seen = new Map<string, TokenTransfer>()

    for (const transfer of transfers) {
      // Create unique key: from + to + amount + type
      // Note: We intentionally exclude tokenAddress from the key
      // because proxy/implementation will have different addresses but same transfer
      const key = `${transfer.from.toLowerCase()}-${transfer.to.toLowerCase()}-${transfer.amount.toString()}-${transfer.type}`

      const existing = seen.get(key)

      if (existing) {
        // If we already have this transfer, keep the one with better metadata
        // Priority: Valid token metadata > UNKNOWN
        const currentHasMetadata = transfer.tokenSymbol && transfer.tokenSymbol !== 'UNKNOWN'
        const existingHasMetadata = existing.tokenSymbol && existing.tokenSymbol !== 'UNKNOWN'

        if (currentHasMetadata && !existingHasMetadata) {
          // Current has metadata, existing doesn't - replace
          seen.set(key, transfer)
        } else if (!currentHasMetadata && existingHasMetadata) {
          // Existing has metadata, current doesn't - keep existing
          continue
        }
        // If both have metadata or both don't, keep first one (existing)
      } else {
        seen.set(key, transfer)
      }
    }

    return Array.from(seen.values())
  }
}
