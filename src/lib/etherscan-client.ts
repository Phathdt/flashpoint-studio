/* eslint-disable @typescript-eslint/no-explicit-any */

export interface EtherscanConfig {
  apiKey: string
  apiUrl: string
  chainId?: number // Optional: For Etherscan API v2 unified endpoint
}

/**
 * Explorer API client for fetching contract ABIs and metadata
 *
 * Supports:
 * - Etherscan API v1 (chain-specific endpoints like https://api.etherscan.io/api)
 * - Etherscan API v2 (unified endpoint https://api.etherscan.io/v2/api with chainid parameter)
 * - Blockscout API (https://blockscout.com/api)
 */
export class EtherscanClient {
  private config: EtherscanConfig
  private abiCache: Map<string, any[]> = new Map()
  private contractNameCache: Map<string, string> = new Map()
  private isV2Api: boolean

  constructor(config: EtherscanConfig) {
    this.config = config
    // Detect if using Etherscan API v2 (unified endpoint)
    this.isV2Api = config.apiUrl.includes('/v2/api')
  }

  /**
   * Fetch contract ABI from Explorer API (Etherscan v2 / Blockscout compatible)
   * @param address Contract address
   * @returns Contract ABI or null if not found
   */
  async fetchContractAbi(address: string): Promise<any[] | null> {
    // Check cache first
    const cacheKey = address.toLowerCase()
    if (this.abiCache.has(cacheKey)) {
      console.debug(`Using cached ABI for ${address}`)
      return this.abiCache.get(cacheKey) || null
    }

    try {
      const url = new URL(this.config.apiUrl)

      // Add chainid for Etherscan API v2
      if (this.isV2Api && this.config.chainId) {
        url.searchParams.set('chainid', this.config.chainId.toString())
      }

      url.searchParams.set('module', 'contract')
      url.searchParams.set('action', 'getabi')
      url.searchParams.set('address', address)

      if (this.config.apiKey) {
        url.searchParams.set('apikey', this.config.apiKey)
      }

      const apiVersion = this.isV2Api ? 'v2' : 'v1'
      console.debug(`Fetching ABI for ${address} from Explorer API (${apiVersion})...`)

      // Use proxy to avoid CORS issues
      const proxyUrl = `/api/etherscan${url.pathname}${url.search}`
      const response = await fetch(proxyUrl, {
        headers: {
          'x-target-url': url.toString(),
        },
      })
      const data = (await response.json()) as {
        status: string
        result?: string
        message?: string
      }

      if (data.status === '1' && data.result) {
        const abi = JSON.parse(data.result)
        this.abiCache.set(cacheKey, abi)
        console.log(`✓ Fetched ABI for ${address}`)
        return abi
      } else {
        console.debug(`No ABI found for ${address}: ${data.message || 'Unknown error'}`)
        return null
      }
    } catch (error) {
      console.warn(`Failed to fetch ABI for ${address}:`, error)
      return null
    }
  }

  /**
   * Fetch ABIs for multiple contract addresses
   * @param addresses Array of contract addresses
   * @returns Map of address to ABI
   */
  async fetchMultipleAbis(addresses: string[]): Promise<Map<string, any[]>> {
    const uniqueAddresses = [...new Set(addresses.map((a) => a.toLowerCase()))]
    const abiMap = new Map<string, any[]>()

    console.log(`Fetching ABIs for ${uniqueAddresses.length} contract(s) from Explorer API...`)

    // Fetch ABIs with rate limiting (5 requests per second for free tier)
    for (let i = 0; i < uniqueAddresses.length; i++) {
      const address = uniqueAddresses[i]

      // Skip if already in cache
      if (this.abiCache.has(address)) {
        const abi = this.abiCache.get(address)
        if (abi) {
          abiMap.set(address, abi)
        }
        continue
      }

      const abi = await this.fetchContractAbi(address)
      if (abi) {
        abiMap.set(address, abi)
      }

      // Rate limiting: wait 200ms between requests (5 req/sec)
      if (i < uniqueAddresses.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 200))
      }
    }

    console.log(`✓ Fetched ${abiMap.size} ABI(s) from Explorer API`)
    return abiMap
  }

  /**
   * Extract all unique contract addresses from parsed trace
   * @param trace Parsed trace data
   * @returns Array of unique contract addresses
   */
  extractAddressesFromTrace(trace: any): string[] {
    const addresses = new Set<string>()

    function traverse(node: any) {
      if (node.to) {
        addresses.add(node.to.toLowerCase())
      }
      if (node.from) {
        addresses.add(node.from.toLowerCase())
      }
      if (node.calls && Array.isArray(node.calls)) {
        node.calls.forEach((call: any) => traverse(call))
      }
    }

    traverse(trace)
    return Array.from(addresses)
  }

  /**
   * Get all cached ABIs
   * @returns Array of all ABIs in cache
   */
  getAllCachedAbis(): any[] {
    return Array.from(this.abiCache.values())
  }

  /**
   * Fetch contract source code info (including contract name)
   * @param address Contract address
   * @returns Contract name or null if not found
   */
  async fetchContractName(address: string): Promise<string | null> {
    // Check cache first
    const cacheKey = address.toLowerCase()
    if (this.contractNameCache.has(cacheKey)) {
      return this.contractNameCache.get(cacheKey) || null
    }

    try {
      const url = new URL(this.config.apiUrl)

      // Add chainid for Etherscan API v2
      if (this.isV2Api && this.config.chainId) {
        url.searchParams.set('chainid', this.config.chainId.toString())
      }

      url.searchParams.set('module', 'contract')
      url.searchParams.set('action', 'getsourcecode')
      url.searchParams.set('address', address)

      if (this.config.apiKey) {
        url.searchParams.set('apikey', this.config.apiKey)
      }

      console.debug(`Fetching contract name for ${address}...`)

      // Use proxy to avoid CORS issues
      const proxyUrl = `/api/etherscan${url.pathname}${url.search}`
      const response = await fetch(proxyUrl, {
        headers: {
          'x-target-url': url.toString(),
        },
      })
      const data = (await response.json()) as {
        status: string
        result?: Array<{ ContractName: string }>
        message?: string
      }

      if (data.status === '1' && data.result && data.result.length > 0) {
        const contractName = data.result[0].ContractName
        if (contractName) {
          this.contractNameCache.set(cacheKey, contractName)
          console.debug(`Contract name for ${address}: ${contractName}`)
          return contractName
        }
      }

      return null
    } catch (error) {
      console.debug(`Failed to fetch contract name for ${address}:`, error)
      return null
    }
  }

  /**
   * Fetch contract names for multiple addresses
   * @param addresses Array of contract addresses
   * @returns Map of address to contract name
   */
  async fetchMultipleContractNames(addresses: string[]): Promise<Map<string, string>> {
    const uniqueAddresses = [...new Set(addresses.map((a) => a.toLowerCase()))]
    const nameMap = new Map<string, string>()

    console.log(`Fetching contract names for ${uniqueAddresses.length} address(es)...`)

    for (let i = 0; i < uniqueAddresses.length; i++) {
      const address = uniqueAddresses[i]

      // Skip if already in cache
      if (this.contractNameCache.has(address)) {
        const name = this.contractNameCache.get(address)
        if (name) {
          nameMap.set(address, name)
        }
        continue
      }

      const name = await this.fetchContractName(address)
      if (name) {
        nameMap.set(address, name)
      }

      // Rate limiting: wait 200ms between requests (5 req/sec)
      if (i < uniqueAddresses.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 200))
      }
    }

    console.log(`✓ Fetched ${nameMap.size} contract name(s)`)
    return nameMap
  }

  /**
   * Get all contract names from cache
   * @returns Map of address to contract name
   */
  getAllContractNames(): Map<string, string> {
    return new Map(this.contractNameCache)
  }

  /**
   * Clear ABI cache
   */
  clearCache(): void {
    this.abiCache.clear()
    this.contractNameCache.clear()
  }
}
