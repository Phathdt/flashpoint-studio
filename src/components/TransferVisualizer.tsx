import type { TokenTransfer, TokenMetadata } from '@/lib/types'
import { getAddressUrl } from '@/lib/etherscan-utils'
import { Copy, ArrowRight } from 'lucide-react'
import { useCopyToClipboard } from '@/hooks'

interface TransferVisualizerProps {
  transfers: TokenTransfer[]
  tokenMetadata: Map<string, TokenMetadata>
  chainId: number
  etherscanUrl?: string
  contractNames?: Map<string, string>
}

export function TransferVisualizer({
  transfers,
  chainId,
  etherscanUrl,
  contractNames = new Map(),
}: TransferVisualizerProps) {
  const { copyToClipboard } = useCopyToClipboard()

  // Filter out UNKNOWN tokens
  const filteredTransfers = transfers.filter((transfer) => {
    const tokenSymbol = transfer.tokenSymbol || 'UNKNOWN'
    return tokenSymbol !== 'UNKNOWN'
  })

  if (!filteredTransfers || filteredTransfers.length === 0) {
    return null
  }

  /**
   * Format address with ellipsis: 0xd011EE22...28d424A14
   */
  const formatAddress = (address: string): string => {
    if (!address) return '0x0000000000000000000000000000000000000000'
    return `${address.slice(0, 10)}...${address.slice(-9)}`
  }

  /**
   * Get contract name for an address
   */
  const getContractName = (address: string): string | undefined => {
    return contractNames.get(address.toLowerCase())
  }

  /**
   * Get address URL for Etherscan
   */
  const getAddressLink = (address: string): string => {
    if (etherscanUrl) {
      return `${etherscanUrl}/address/${address}`
    }
    return getAddressUrl(address, chainId)
  }

  return (
    <div className="rounded-lg border-2 border-border bg-card">
      {/* Header */}
      <div className="border-b-2 border-border bg-muted px-4 py-3">
        <h3 className="text-center text-xl font-bold">BALANCE CHANGES</h3>
      </div>

      {/* Transfers List */}
      <div className="divide-y divide-border">
        {filteredTransfers.map((transfer, index) => {
          const isNative = transfer.type === 'native'
          const tokenSymbol = transfer.tokenSymbol || 'UNKNOWN'
          const tokenName = transfer.tokenName || 'Unknown Token'
          const formattedAmount = transfer.formattedAmount || transfer.amount.toString()

          return (
            <div
              key={`${transfer.from}-${transfer.to}-${transfer.amount}-${index}`}
              className="flex items-center gap-2 p-3 text-xs font-mono"
            >
              {/* Token Type Badge */}
              <div className="flex-shrink-0">
                {isNative ? (
                  <span className="rounded bg-green-100 px-2 py-1 font-bold text-green-700 dark:bg-green-900 dark:text-green-300">
                    {tokenSymbol}
                  </span>
                ) : (
                  <span className="rounded bg-blue-100 px-2 py-1 font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                    {tokenSymbol}
                  </span>
                )}
              </div>

              {/* From Address */}
              <div className="flex items-center gap-1">
                <a
                  href={getAddressLink(transfer.from)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:underline dark:text-purple-400"
                >
                  {formatAddress(transfer.from)}
                </a>
                {getContractName(transfer.from) && (
                  <span className="text-blue-500 dark:text-blue-400">
                    ({getContractName(transfer.from)})
                  </span>
                )}
                <button
                  onClick={() => copyToClipboard(transfer.from, 'From')}
                  className="rounded p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700"
                  title="Copy from address"
                >
                  <Copy className="h-3 w-3 text-slate-500" />
                </button>
              </div>

              {/* Arrow */}
              <ArrowRight className="h-3 w-3 flex-shrink-0 text-slate-400" />

              {/* To Address */}
              <div className="flex items-center gap-1">
                <a
                  href={getAddressLink(transfer.to)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:underline dark:text-purple-400"
                >
                  {formatAddress(transfer.to)}
                </a>
                {getContractName(transfer.to) && (
                  <span className="text-blue-500 dark:text-blue-400">
                    ({getContractName(transfer.to)})
                  </span>
                )}
                <button
                  onClick={() => copyToClipboard(transfer.to, 'To')}
                  className="rounded p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700"
                  title="Copy to address"
                >
                  <Copy className="h-3 w-3 text-slate-500" />
                </button>
              </div>

              {/* Separator */}
              <span className="text-slate-400">|</span>

              {/* Amount */}
              <div className="flex items-center gap-1">
                <span className="text-slate-600 dark:text-slate-400">For:</span>
                <span className="font-bold text-orange-600 dark:text-orange-300">
                  {formattedAmount}
                </span>
                <span className="text-slate-600 dark:text-slate-400">{tokenSymbol}</span>
              </div>

              {/* Token Contract (for ERC-20 only) */}
              {!isNative && transfer.tokenAddress && (
                <>
                  <span className="text-slate-400">|</span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-600 dark:text-slate-400">Token:</span>
                    <a
                      href={getAddressLink(transfer.tokenAddress)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:underline dark:text-purple-400"
                    >
                      {formatAddress(transfer.tokenAddress)}
                    </a>
                    {getContractName(transfer.tokenAddress) && (
                      <span className="text-blue-500 dark:text-blue-400">
                        ({getContractName(transfer.tokenAddress)})
                      </span>
                    )}
                    <button
                      onClick={() => copyToClipboard(transfer.tokenAddress!, 'Token')}
                      className="rounded p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700"
                      title="Copy token address"
                    >
                      <Copy className="h-3 w-3 text-slate-500" />
                    </button>
                  </div>
                </>
              )}

              {/* Token Name (for ERC-20 only) */}
              {!isNative && tokenName !== 'Unknown Token' && (
                <span className="text-slate-500 dark:text-slate-500">({tokenName})</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Summary */}
      <div className="border-t-2 border-border bg-muted px-4 py-3 text-sm">
        <div className="text-center">
          <span className="font-bold">Total Transfers:</span> {filteredTransfers.length}
          <span className="mx-2 text-slate-400">•</span>
          <span className="font-bold">Native:</span>{' '}
          {filteredTransfers.filter((t) => t.type === 'native').length}
          <span className="mx-2 text-slate-400">•</span>
          <span className="font-bold">ERC-20:</span>{' '}
          {filteredTransfers.filter((t) => t.type === 'erc20').length}
        </div>
      </div>
    </div>
  )
}
