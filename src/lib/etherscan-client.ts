/* eslint-disable @typescript-eslint/no-explicit-any */
import { getCache } from './indexeddb-cache'

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
    const cacheKey = address.toLowerCase()

    // Check in-memory cache first (fastest)
    if (this.abiCache.has(cacheKey)) {
      console.debug(`Using in-memory cached ABI for ${address}`)
      return this.abiCache.get(cacheKey) || null
    }

    // Check IndexedDB cache (persistent across sessions)
    const cache = getCache()
    const cachedAbi = await cache.getAbi(cacheKey, this.config.chainId)
    if (cachedAbi) {
      console.debug(`Using IndexedDB cached ABI for ${address}`)
      // Also populate in-memory cache for faster subsequent access
      this.abiCache.set(cacheKey, cachedAbi)
      return cachedAbi
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
        // Cache in both in-memory and IndexedDB
        this.abiCache.set(cacheKey, abi)
        await cache.setAbi(cacheKey, abi, this.config.chainId)
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

    // Return cached ABIs immediately
    const addressesToFetch = uniqueAddresses.filter((address) => {
      if (this.abiCache.has(address)) {
        const abi = this.abiCache.get(address)
        if (abi) {
          abiMap.set(address, abi)
        }
        return false
      }
      return true
    })

    if (addressesToFetch.length === 0) {
      console.log(`Using cached ABIs for ${uniqueAddresses.length} contract(s)`)
      return abiMap
    }

    console.log(
      `Fetching ABIs for ${addressesToFetch.length} contract(s) from Explorer API (${uniqueAddresses.length - addressesToFetch.length} cached)...`
    )

    // Parallel fetch with batching to respect rate limits (5 req/sec = batch of 5 every 1 second)
    const batchSize = 5
    const batches: string[][] = []

    for (let i = 0; i < addressesToFetch.length; i += batchSize) {
      batches.push(addressesToFetch.slice(i, i + batchSize))
    }

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]

      // Fetch all addresses in this batch in parallel
      const results = await Promise.all(batch.map((address) => this.fetchContractAbi(address)))

      // Add successful results to map
      results.forEach((abi, index) => {
        if (abi) {
          abiMap.set(batch[index], abi)
        }
      })

      // Rate limiting: wait 1 second between batches (except for last batch)
      if (i < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
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
    const cacheKey = address.toLowerCase()

    // Check in-memory cache first (fastest)
    if (this.contractNameCache.has(cacheKey)) {
      console.debug(`Using in-memory cached contract name for ${address}`)
      return this.contractNameCache.get(cacheKey) || null
    }

    // Check IndexedDB cache (persistent across sessions)
    const cache = getCache()
    const cachedName = await cache.getContractName(cacheKey, this.config.chainId)
    if (cachedName) {
      console.debug(`Using IndexedDB cached contract name for ${address}`)
      // Also populate in-memory cache for faster subsequent access
      this.contractNameCache.set(cacheKey, cachedName)
      return cachedName
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
          // Cache in both in-memory and IndexedDB
          this.contractNameCache.set(cacheKey, contractName)
          await cache.setContractName(cacheKey, contractName, this.config.chainId)
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

    // Return cached names immediately
    const addressesToFetch = uniqueAddresses.filter((address) => {
      if (this.contractNameCache.has(address)) {
        const name = this.contractNameCache.get(address)
        if (name) {
          nameMap.set(address, name)
        }
        return false
      }
      return true
    })

    if (addressesToFetch.length === 0) {
      console.log(`Using cached contract names for ${uniqueAddresses.length} address(es)`)
      return nameMap
    }

    console.log(
      `Fetching contract names for ${addressesToFetch.length} address(es) (${uniqueAddresses.length - addressesToFetch.length} cached)...`
    )

    // Parallel fetch with batching to respect rate limits (5 req/sec = batch of 5 every 1 second)
    const batchSize = 5
    const batches: string[][] = []

    for (let i = 0; i < addressesToFetch.length; i += batchSize) {
      batches.push(addressesToFetch.slice(i, i + batchSize))
    }

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]

      // Fetch all addresses in this batch in parallel
      const results = await Promise.all(batch.map((address) => this.fetchContractName(address)))

      // Add successful results to map
      results.forEach((name, index) => {
        if (name) {
          nameMap.set(batch[index], name)
        }
      })

      // Rate limiting: wait 1 second between batches (except for last batch)
      if (i < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
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
