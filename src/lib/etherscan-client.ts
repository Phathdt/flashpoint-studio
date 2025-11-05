/* eslint-disable @typescript-eslint/no-explicit-any */
import { getCache } from './indexeddb-cache'
import { RateLimiter } from './rate-limiter'

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
  private isV2Api: boolean
  private rateLimiter: RateLimiter

  constructor(config: EtherscanConfig) {
    this.config = config
    // Detect if using Etherscan API v2 (unified endpoint)
    this.isV2Api = config.apiUrl.includes('/v2/api')
    // Initialize rate limiter: 4 requests per second (safe margin below 5/sec limit)
    this.rateLimiter = new RateLimiter(4)
  }

  /**
   * Fetch contract ABI from Explorer API (Etherscan v2 / Blockscout compatible)
   * @param address Contract address
   * @returns Contract ABI or null if not found
   */
  async fetchContractAbi(address: string): Promise<any[] | null> {
    const cacheKey = address.toLowerCase()

    // Check IndexedDB cache first
    const cache = getCache()
    const cachedAbi = await cache.getAbi(cacheKey, this.config.chainId)
    if (cachedAbi) {
      console.debug(`Using cached ABI for ${address}`)
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

      // Apply rate limiting before making the request
      const response = await this.rateLimiter.execute(() =>
        fetch(proxyUrl, {
          headers: {
            'x-target-url': url.toString(),
          },
        })
      )

      const data = (await response.json()) as {
        status: string
        result?: string
        message?: string
      }

      if (data.status === '1' && data.result) {
        const abi = JSON.parse(data.result)
        // Cache in IndexedDB
        await cache.setAbi(cacheKey, abi, this.config.chainId)
        console.log(`✓ Fetched ABI for ${address}`)
        return abi
      } else {
        // Cache "not found" result to avoid repeated requests
        console.debug(`No ABI found for ${address}: ${data.message || 'Unknown error'}`)
        await cache.setAbi(cacheKey, [], this.config.chainId)
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

    // Check IndexedDB cache for all addresses
    const cache = getCache()
    const addressesToFetch: string[] = []

    for (const address of uniqueAddresses) {
      const cachedAbi = await cache.getAbi(address, this.config.chainId)
      if (cachedAbi !== null) {
        // cachedAbi is either a valid ABI array or empty array (not found)
        if (cachedAbi.length > 0) {
          abiMap.set(address, cachedAbi)
        }
        // Skip fetching for both found and "not found" cached results
      } else {
        // null means not in cache, need to fetch
        addressesToFetch.push(address)
      }
    }

    if (addressesToFetch.length === 0) {
      const cachedCount = uniqueAddresses.length
      if (cachedCount > 0) {
        console.log(`Using cached ABIs for ${cachedCount} contract(s)`)
      }
      return abiMap
    }

    const cachedCount = uniqueAddresses.length - addressesToFetch.length
    console.log(
      `Fetching ABIs for ${addressesToFetch.length} contract(s) from Explorer API (${cachedCount} cached)...`
    )

    // Fetch all addresses with rate limiting handled by RateLimiter
    const results = await Promise.all(
      addressesToFetch.map((address) => this.fetchContractAbi(address))
    )

    // Add successful results to map
    results.forEach((abi, index) => {
      if (abi) {
        abiMap.set(addressesToFetch[index], abi)
      }
    })

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
   * Fetch contract source code info (including contract name)
   * @param address Contract address
   * @returns Contract name or null if not found
   */
  async fetchContractName(address: string): Promise<string | null> {
    const cacheKey = address.toLowerCase()

    // Check IndexedDB cache first
    const cache = getCache()
    const cachedName = await cache.getContractName(cacheKey, this.config.chainId)
    if (cachedName) {
      console.debug(`Using cached contract name for ${address}`)
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

      // Apply rate limiting before making the request
      const response = await this.rateLimiter.execute(() =>
        fetch(proxyUrl, {
          headers: {
            'x-target-url': url.toString(),
          },
        })
      )

      const data = (await response.json()) as {
        status: string
        result?: Array<{ ContractName: string }>
        message?: string
      }

      if (data.status === '1' && data.result && data.result.length > 0) {
        const contractName = data.result[0].ContractName
        if (contractName) {
          // Cache in IndexedDB
          await cache.setContractName(cacheKey, contractName, this.config.chainId)
          console.debug(`Contract name for ${address}: ${contractName}`)
          return contractName
        }
      }

      // Cache "not found" result to avoid repeated requests
      console.debug(`No contract name found for ${address}`)
      await cache.setContractName(cacheKey, '', this.config.chainId)
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

    // Check IndexedDB cache for all addresses
    const cache = getCache()
    const addressesToFetch: string[] = []

    for (const address of uniqueAddresses) {
      const cachedName = await cache.getContractName(address, this.config.chainId)
      if (cachedName !== null) {
        // cachedName is either a valid name or empty string (not found)
        if (cachedName !== '') {
          nameMap.set(address, cachedName)
        }
        // Skip fetching for both found and "not found" cached results
      } else {
        // null means not in cache, need to fetch
        addressesToFetch.push(address)
      }
    }

    if (addressesToFetch.length === 0) {
      const cachedCount = uniqueAddresses.length
      if (cachedCount > 0) {
        console.log(`Using cached contract names for ${cachedCount} address(es)`)
      }
      return nameMap
    }

    const cachedCount = uniqueAddresses.length - addressesToFetch.length
    console.log(
      `Fetching contract names for ${addressesToFetch.length} address(es) (${cachedCount} cached)...`
    )

    // Fetch all addresses with rate limiting handled by RateLimiter
    const results = await Promise.all(
      addressesToFetch.map((address) => this.fetchContractName(address))
    )

    // Add successful results to map
    results.forEach((name, index) => {
      if (name) {
        nameMap.set(addressesToFetch[index], name)
      }
    })

    console.log(`✓ Fetched ${nameMap.size} contract name(s)`)
    return nameMap
  }
}
