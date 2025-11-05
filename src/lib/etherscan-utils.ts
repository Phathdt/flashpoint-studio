/**
 * Get network name from chain ID
 */
export function getNetworkName(chainId: number): string {
  const networkNames: Record<number, string> = {
    // Ethereum
    1: 'Ethereum Mainnet',
    11155111: 'Sepolia Testnet',

    // Optimism
    10: 'Optimism',
    11155420: 'Optimism Sepolia',

    // BSC
    56: 'BNB Smart Chain',
    97: 'BNB Testnet',

    // Polygon
    137: 'Polygon',
    80002: 'Polygon Amoy',

    // Arbitrum
    42161: 'Arbitrum One',
    421614: 'Arbitrum Sepolia',

    // Base
    8453: 'Base',
    84532: 'Base Sepolia',
  }

  return networkNames[chainId] || `Unknown Network (${chainId})`
}

/**
 * Get Etherscan URL for a given chain ID
 */
export function getEtherscanUrl(chainId: number): string {
  const explorerUrls: Record<number, string> = {
    // Ethereum
    1: 'https://etherscan.io',
    11155111: 'https://sepolia.etherscan.io',

    // Optimism
    10: 'https://optimistic.etherscan.io',
    11155420: 'https://sepolia-optimism.etherscan.io',

    // BSC
    56: 'https://bscscan.com',
    97: 'https://testnet.bscscan.com',

    // Polygon
    137: 'https://polygonscan.com',
    80002: 'https://amoy.polygonscan.com',

    // Arbitrum
    42161: 'https://arbiscan.io',
    421614: 'https://sepolia.arbiscan.io',

    // Base
    8453: 'https://basescan.org',
    84532: 'https://sepolia.basescan.org',
  }

  const url = explorerUrls[chainId]
  if (!url) {
    throw new Error(
      `Unsupported chain ID: ${chainId}. Please provide a custom Etherscan URL in the form.`
    )
  }
  return url
}

/**
 * Get address URL on Etherscan
 */
export function getAddressUrl(address: string, chainId: number): string {
  const baseUrl = getEtherscanUrl(chainId)
  return `${baseUrl}/address/${address}`
}
