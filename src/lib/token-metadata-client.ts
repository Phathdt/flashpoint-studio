import { ethers } from 'ethers'
import { getCache } from './indexeddb-cache'
import type { TokenMetadata } from './types'

/**
 * ERC-20 metadata ABI (minimal interface)
 */
const ERC20_METADATA_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
]

/**
 * Client for fetching ERC-20 token metadata
 */
export class TokenMetadataClient {
  private provider: ethers.JsonRpcProvider
  private chainId: number
  private cache = getCache()

  constructor(provider: ethers.JsonRpcProvider, chainId: number) {
    this.provider = provider
    this.chainId = chainId
  }

  /**
   * Fetch token metadata for a single address
   */
  async fetchTokenMetadata(address: string): Promise<TokenMetadata | null> {
    try {
      const normalizedAddress = address.toLowerCase()

      // Check cache first
      const cached = await this.cache.getTokenMetadata(normalizedAddress, this.chainId)
      if (cached) {
        return {
          address: normalizedAddress,
          ...cached,
        }
      }

      console.log(`Fetching token metadata for ${address}...`)

      // Create contract instance
      const contract = new ethers.Contract(address, ERC20_METADATA_ABI, this.provider)

      // Fetch metadata with timeout
      const timeout = 5000 // 5 seconds timeout
      const [name, symbol, decimals] = await Promise.race([
        Promise.all([
          contract.name().catch(() => 'Unknown Token'),
          contract.symbol().catch(() => 'UNKNOWN'),
          contract.decimals().catch(() => 18),
        ]),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout fetching token metadata')), timeout)
        ),
      ])

      const metadata: TokenMetadata = {
        address: normalizedAddress,
        name,
        symbol,
        decimals: Number(decimals),
      }

      // Cache the result
      await this.cache.setTokenMetadata(normalizedAddress, metadata, this.chainId)

      console.log(`✓ Fetched metadata for ${symbol} (${name})`)
      return metadata
    } catch (error) {
      console.warn(`Failed to fetch token metadata for ${address}:`, error)
      // Return default metadata on failure
      return {
        address: address.toLowerCase(),
        name: 'Unknown Token',
        symbol: 'UNKNOWN',
        decimals: 18,
      }
    }
  }

  /**
   * Fetch token metadata for multiple addresses in parallel
   */
  async fetchMultipleTokenMetadata(addresses: string[]): Promise<Map<string, TokenMetadata>> {
    const metadataMap = new Map<string, TokenMetadata>()

    // Deduplicate addresses
    const uniqueAddresses = Array.from(new Set(addresses.map((addr) => addr.toLowerCase())))

    console.log(`Fetching metadata for ${uniqueAddresses.length} token(s)...`)

    // Fetch all metadata in parallel
    const results = await Promise.allSettled(
      uniqueAddresses.map((address) => this.fetchTokenMetadata(address))
    )

    // Process results
    results.forEach((result, index) => {
      const address = uniqueAddresses[index]
      if (result.status === 'fulfilled' && result.value) {
        metadataMap.set(address, result.value)
      } else {
        // Add default metadata on failure
        metadataMap.set(address, {
          address,
          name: 'Unknown Token',
          symbol: 'UNKNOWN',
          decimals: 18,
        })
      }
    })

    console.log(`✓ Fetched metadata for ${metadataMap.size} token(s)`)
    return metadataMap
  }
}
