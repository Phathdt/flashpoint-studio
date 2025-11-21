/* eslint-disable @typescript-eslint/no-explicit-any */
import { getCache } from './indexeddb-cache'
import { RateLimiter } from './rate-limiter'
import type { ApiExecutionStrategy, RetryConfig } from './types'

export interface EtherscanConfig {
  apiKey: string // Comma-separated API keys for rotation (e.g., "key1,key2,key3")
  apiUrl: string
  chainId?: number // Optional: For Etherscan API v2 unified endpoint
  executionStrategy?: ApiExecutionStrategy // Optional: parallel (default) or sequential
  retryConfig?: RetryConfig // Optional: retry configuration
  rateLimit?: number // Optional: requests per second (default: 2, min: 2)
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
  private rateLimiters: Map<string, RateLimiter> // Per-key rate limiters
  private globalRateLimiter: RateLimiter // Fallback for no API key
  private executionStrategy: ApiExecutionStrategy
  private retryConfig: RetryConfig
  private apiKeys: string[]
  private currentKeyIndex: number
  private ratePerKey: number

  constructor(config: EtherscanConfig) {
    this.config = config
    // Detect if using Etherscan API v2 (unified endpoint)
    this.isV2Api = config.apiUrl.includes('/v2/api')
    // Parse comma-separated API keys for rotation
    this.apiKeys = config.apiKey
      ? config.apiKey
          .split(',')
          .map((k) => k.trim())
          .filter((k) => k.length > 0)
      : []
    this.currentKeyIndex = 0

    // Calculate rate per key: total rate limit / number of keys
    const totalRateLimit = Math.max(config.rateLimit || 2, 2)
    const numKeys = Math.max(this.apiKeys.length, 1)
    this.ratePerKey = Math.max(Math.floor(totalRateLimit / numKeys), 1)

    // Initialize per-key rate limiters
    this.rateLimiters = new Map()
    for (const key of this.apiKeys) {
      this.rateLimiters.set(key, new RateLimiter(this.ratePerKey))
    }
    // Fallback rate limiter for no API key case
    this.globalRateLimiter = new RateLimiter(this.ratePerKey)

    // Default to parallel execution for backward compatibility
    this.executionStrategy = config.executionStrategy || 'parallel'
    // Default retry config: 3 retries with 30s timeout
    this.retryConfig = config.retryConfig || { maxRetries: 3, timeout: 30000 }

    if (this.apiKeys.length > 1) {
      console.log(
        `Using ${this.apiKeys.length} API keys with rotation (${this.ratePerKey} RPS per key, ${totalRateLimit} RPS total)`
      )
    } else {
      console.log(`Using rate limit: ${this.ratePerKey} RPS`)
    }
  }

  /**
   * Get the next API key using round-robin rotation
   */
  private getNextApiKey(): string {
    if (this.apiKeys.length === 0) return ''
    const key = this.apiKeys[this.currentKeyIndex]
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length
    return key
  }

  /**
   * Get rate limiter for a specific API key
   */
  private getRateLimiter(apiKey: string): RateLimiter {
    if (!apiKey) return this.globalRateLimiter
    return this.rateLimiters.get(apiKey) || this.globalRateLimiter
  }

  /**
   * Execute a request with retry logic and timeout
   * @param fn Function to execute
   * @param context Context description for logging
   * @returns Result from the function or throws error after all retries exhausted
   */
  private async executeWithRetry<T>(fn: () => Promise<T>, context: string): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Request timeout after ${this.retryConfig.timeout}ms`))
          }, this.retryConfig.timeout)
        })

        // Race between the actual request and timeout
        const result = await Promise.race([fn(), timeoutPromise])

        // Success - return result
        if (attempt > 0) {
          console.log(`✓ ${context} succeeded on retry ${attempt}`)
        }
        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        if (attempt < this.retryConfig.maxRetries) {
          // Use longer delay for rate limit errors
          const isRateLimitError = lastError.message.includes('rate limit')
          const baseDelay = isRateLimitError ? 2000 : 1000
          const delay = Math.min(baseDelay * Math.pow(2, attempt), 10000) // Exponential backoff, max 10s
          console.warn(
            `⚠ ${context} failed (attempt ${attempt + 1}/${this.retryConfig.maxRetries + 1}): ${lastError.message}. Retrying in ${delay}ms...`
          )
          await new Promise((resolve) => setTimeout(resolve, delay))
        } else {
          console.error(
            `✗ ${context} failed after ${this.retryConfig.maxRetries + 1} attempts: ${lastError.message}`
          )
        }
      }
    }

    throw lastError || new Error(`${context} failed after all retries`)
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

    // Fetch with retry logic
    return this.executeWithRetry(async () => {
      const url = new URL(this.config.apiUrl)

      // Add chainid for Etherscan API v2
      if (this.isV2Api && this.config.chainId) {
        url.searchParams.set('chainid', this.config.chainId.toString())
      }

      url.searchParams.set('module', 'contract')
      url.searchParams.set('action', 'getabi')
      url.searchParams.set('address', address)

      const apiKey = this.getNextApiKey()
      if (apiKey) {
        url.searchParams.set('apikey', apiKey)
      }

      const apiVersion = this.isV2Api ? 'v2' : 'v1'
      console.debug(`Fetching ABI for ${address} from Explorer API (${apiVersion})...`)

      // Use proxy to avoid CORS issues
      const proxyUrl = `/api/etherscan${url.pathname}${url.search}`

      // Apply per-key rate limiting before making the request
      const rateLimiter = this.getRateLimiter(apiKey)
      const response = await rateLimiter.execute(() =>
        fetch(proxyUrl, {
          headers: {
            'x-target-url': url.toString(),
          },
        })
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = (await response.json()) as {
        status: string
        result?: string
        message?: string
      }

      // Check for rate limit error - throw to trigger retry
      if (data.message?.includes('rate limit')) {
        throw new Error(`Rate limit reached: ${data.result || data.message}`)
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
    }, `Fetch ABI for ${address}`).catch((error) => {
      console.warn(`Failed to fetch ABI for ${address} after retries:`, error)
      return null
    })
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
      `Fetching ABIs for ${addressesToFetch.length} contract(s) from Explorer API (${cachedCount} cached, strategy: ${this.executionStrategy})...`
    )

    // Fetch addresses based on execution strategy
    if (this.executionStrategy === 'sequential') {
      // Sequential execution: fetch one at a time
      for (const address of addressesToFetch) {
        const abi = await this.fetchContractAbi(address)
        if (abi) {
          abiMap.set(address, abi)
        }
      }
    } else {
      // Parallel execution with rate limiting (default)
      const results = await Promise.all(
        addressesToFetch.map((address) => this.fetchContractAbi(address))
      )

      // Add successful results to map
      results.forEach((abi, index) => {
        if (abi) {
          abiMap.set(addressesToFetch[index], abi)
        }
      })
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

    // Fetch with retry logic
    return this.executeWithRetry(async () => {
      const url = new URL(this.config.apiUrl)

      // Add chainid for Etherscan API v2
      if (this.isV2Api && this.config.chainId) {
        url.searchParams.set('chainid', this.config.chainId.toString())
      }

      url.searchParams.set('module', 'contract')
      url.searchParams.set('action', 'getsourcecode')
      url.searchParams.set('address', address)

      const apiKey = this.getNextApiKey()
      if (apiKey) {
        url.searchParams.set('apikey', apiKey)
      }

      console.debug(`Fetching contract name for ${address}...`)

      // Use proxy to avoid CORS issues
      const proxyUrl = `/api/etherscan${url.pathname}${url.search}`

      // Apply per-key rate limiting before making the request
      const rateLimiter = this.getRateLimiter(apiKey)
      const response = await rateLimiter.execute(() =>
        fetch(proxyUrl, {
          headers: {
            'x-target-url': url.toString(),
          },
        })
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = (await response.json()) as {
        status: string
        result?: Array<{ ContractName: string }>
        message?: string
      }

      // Check for rate limit error - throw to trigger retry
      if (data.message?.includes('rate limit')) {
        throw new Error(`Rate limit reached: ${data.message}`)
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
    }, `Fetch contract name for ${address}`).catch((error) => {
      console.debug(`Failed to fetch contract name for ${address} after retries:`, error)
      return null
    })
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
      `Fetching contract names for ${addressesToFetch.length} address(es) (${cachedCount} cached, strategy: ${this.executionStrategy})...`
    )

    // Fetch addresses based on execution strategy
    if (this.executionStrategy === 'sequential') {
      // Sequential execution: fetch one at a time
      for (const address of addressesToFetch) {
        const name = await this.fetchContractName(address)
        if (name) {
          nameMap.set(address, name)
        }
      }
    } else {
      // Parallel execution with rate limiting (default)
      const results = await Promise.all(
        addressesToFetch.map((address) => this.fetchContractName(address))
      )

      // Add successful results to map
      results.forEach((name, index) => {
        if (name) {
          nameMap.set(addressesToFetch[index], name)
        }
      })
    }

    console.log(`✓ Fetched ${nameMap.size} contract name(s)`)
    return nameMap
  }
}
