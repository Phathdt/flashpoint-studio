/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * IndexedDB-based cache for Etherscan ABI and contract name data
 * Provides persistent storage across browser sessions
 */

const DB_NAME = 'flashpoint-studio-cache'
const DB_VERSION = 2 // Incremented for token metadata store
const STORE_ABIS = 'abis'
const STORE_CONTRACT_NAMES = 'contract-names'
const STORE_TOKEN_METADATA = 'token-metadata'

// Cache expiration time: 7 days in milliseconds
const CACHE_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000

// Token metadata cache expiration: 30 days in milliseconds
const TOKEN_METADATA_EXPIRATION_MS = 30 * 24 * 60 * 60 * 1000

interface CacheEntry<T> {
  key: string
  value: T
  timestamp: number
  chainId?: number
}

export class IndexedDBCache {
  private dbPromise: Promise<IDBDatabase> | null = null

  /**
   * Initialize the IndexedDB database
   */
  private async getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains(STORE_ABIS)) {
          const abiStore = db.createObjectStore(STORE_ABIS, { keyPath: 'key' })
          abiStore.createIndex('timestamp', 'timestamp', { unique: false })
          abiStore.createIndex('chainId', 'chainId', { unique: false })
        }

        if (!db.objectStoreNames.contains(STORE_CONTRACT_NAMES)) {
          const nameStore = db.createObjectStore(STORE_CONTRACT_NAMES, { keyPath: 'key' })
          nameStore.createIndex('timestamp', 'timestamp', { unique: false })
          nameStore.createIndex('chainId', 'chainId', { unique: false })
        }

        if (!db.objectStoreNames.contains(STORE_TOKEN_METADATA)) {
          const tokenStore = db.createObjectStore(STORE_TOKEN_METADATA, { keyPath: 'key' })
          tokenStore.createIndex('timestamp', 'timestamp', { unique: false })
          tokenStore.createIndex('chainId', 'chainId', { unique: false })
        }

        console.log('IndexedDB schema upgraded to version', DB_VERSION)
      }
    })

    return this.dbPromise
  }

  /**
   * Generate cache key for an address and chain
   */
  private getCacheKey(address: string, chainId?: number): string {
    const normalizedAddress = address.toLowerCase()
    return chainId ? `${normalizedAddress}-${chainId}` : normalizedAddress
  }

  /**
   * Check if a cache entry is expired
   */
  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > CACHE_EXPIRATION_MS
  }

  /**
   * Get ABI from cache
   */
  async getAbi(address: string, chainId?: number): Promise<any[] | null> {
    try {
      const db = await this.getDB()
      const key = this.getCacheKey(address, chainId)

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_ABIS, 'readonly')
        const store = transaction.objectStore(STORE_ABIS)
        const request = store.get(key)

        request.onsuccess = () => {
          const entry = request.result as CacheEntry<any[]> | undefined

          if (!entry) {
            resolve(null)
            return
          }

          // Check if expired
          if (this.isExpired(entry.timestamp)) {
            console.debug(`Cache expired for ABI ${address}`)
            // Delete expired entry asynchronously
            this.deleteAbi(address, chainId).catch(() => {
              /* ignore */
            })
            resolve(null)
            return
          }

          console.debug(`Cache hit for ABI ${address}`)
          resolve(entry.value)
        }

        request.onerror = () => {
          console.warn('Failed to get ABI from cache:', request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      console.warn('IndexedDB cache error:', error)
      return null
    }
  }

  /**
   * Set ABI in cache
   */
  async setAbi(address: string, abi: any[], chainId?: number): Promise<void> {
    try {
      const db = await this.getDB()
      const key = this.getCacheKey(address, chainId)

      const entry: CacheEntry<any[]> = {
        key,
        value: abi,
        timestamp: Date.now(),
        chainId,
      }

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_ABIS, 'readwrite')
        const store = transaction.objectStore(STORE_ABIS)
        const request = store.put(entry)

        request.onsuccess = () => {
          console.debug(`Cached ABI for ${address}`)
          resolve()
        }

        request.onerror = () => {
          console.warn('Failed to cache ABI:', request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      console.warn('IndexedDB cache error:', error)
    }
  }

  /**
   * Delete ABI from cache
   */
  async deleteAbi(address: string, chainId?: number): Promise<void> {
    try {
      const db = await this.getDB()
      const key = this.getCacheKey(address, chainId)

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_ABIS, 'readwrite')
        const store = transaction.objectStore(STORE_ABIS)
        const request = store.delete(key)

        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.warn('IndexedDB cache error:', error)
    }
  }

  /**
   * Get contract name from cache
   */
  async getContractName(address: string, chainId?: number): Promise<string | null> {
    try {
      const db = await this.getDB()
      const key = this.getCacheKey(address, chainId)

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_CONTRACT_NAMES, 'readonly')
        const store = transaction.objectStore(STORE_CONTRACT_NAMES)
        const request = store.get(key)

        request.onsuccess = () => {
          const entry = request.result as CacheEntry<string> | undefined

          if (!entry) {
            resolve(null)
            return
          }

          // Check if expired
          if (this.isExpired(entry.timestamp)) {
            console.debug(`Cache expired for contract name ${address}`)
            // Delete expired entry asynchronously
            this.deleteContractName(address, chainId).catch(() => {
              /* ignore */
            })
            resolve(null)
            return
          }

          console.debug(`Cache hit for contract name ${address}`)
          resolve(entry.value)
        }

        request.onerror = () => {
          console.warn('Failed to get contract name from cache:', request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      console.warn('IndexedDB cache error:', error)
      return null
    }
  }

  /**
   * Set contract name in cache
   */
  async setContractName(address: string, name: string, chainId?: number): Promise<void> {
    try {
      const db = await this.getDB()
      const key = this.getCacheKey(address, chainId)

      const entry: CacheEntry<string> = {
        key,
        value: name,
        timestamp: Date.now(),
        chainId,
      }

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_CONTRACT_NAMES, 'readwrite')
        const store = transaction.objectStore(STORE_CONTRACT_NAMES)
        const request = store.put(entry)

        request.onsuccess = () => {
          console.debug(`Cached contract name for ${address}`)
          resolve()
        }

        request.onerror = () => {
          console.warn('Failed to cache contract name:', request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      console.warn('IndexedDB cache error:', error)
    }
  }

  /**
   * Delete contract name from cache
   */
  async deleteContractName(address: string, chainId?: number): Promise<void> {
    try {
      const db = await this.getDB()
      const key = this.getCacheKey(address, chainId)

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_CONTRACT_NAMES, 'readwrite')
        const store = transaction.objectStore(STORE_CONTRACT_NAMES)
        const request = store.delete(key)

        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.warn('IndexedDB cache error:', error)
    }
  }

  /**
   * Get token metadata from cache
   */
  async getTokenMetadata(
    address: string,
    chainId?: number
  ): Promise<{ name: string; symbol: string; decimals: number } | null> {
    try {
      const db = await this.getDB()
      const key = this.getCacheKey(address, chainId)

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_TOKEN_METADATA, 'readonly')
        const store = transaction.objectStore(STORE_TOKEN_METADATA)
        const request = store.get(key)

        request.onsuccess = () => {
          const entry = request.result as
            | CacheEntry<{ name: string; symbol: string; decimals: number }>
            | undefined

          if (!entry) {
            resolve(null)
            return
          }

          // Check if expired (30 days for token metadata)
          if (Date.now() - entry.timestamp > TOKEN_METADATA_EXPIRATION_MS) {
            console.debug(`Cache expired for token metadata ${address}`)
            // Delete expired entry asynchronously
            this.deleteTokenMetadata(address, chainId).catch(() => {
              /* ignore */
            })
            resolve(null)
            return
          }

          console.debug(`Cache hit for token metadata ${address}`)
          resolve(entry.value)
        }

        request.onerror = () => {
          console.warn('Failed to get token metadata from cache:', request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      console.warn('IndexedDB cache error:', error)
      return null
    }
  }

  /**
   * Set token metadata in cache
   */
  async setTokenMetadata(
    address: string,
    metadata: { name: string; symbol: string; decimals: number },
    chainId?: number
  ): Promise<void> {
    try {
      const db = await this.getDB()
      const key = this.getCacheKey(address, chainId)

      const entry: CacheEntry<{ name: string; symbol: string; decimals: number }> = {
        key,
        value: metadata,
        timestamp: Date.now(),
        chainId,
      }

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_TOKEN_METADATA, 'readwrite')
        const store = transaction.objectStore(STORE_TOKEN_METADATA)
        const request = store.put(entry)

        request.onsuccess = () => {
          console.debug(`Cached token metadata for ${address}`)
          resolve()
        }

        request.onerror = () => {
          console.warn('Failed to cache token metadata:', request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      console.warn('IndexedDB cache error:', error)
    }
  }

  /**
   * Delete token metadata from cache
   */
  async deleteTokenMetadata(address: string, chainId?: number): Promise<void> {
    try {
      const db = await this.getDB()
      const key = this.getCacheKey(address, chainId)

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_TOKEN_METADATA, 'readwrite')
        const store = transaction.objectStore(STORE_TOKEN_METADATA)
        const request = store.delete(key)

        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.warn('IndexedDB cache error:', error)
    }
  }

  /**
   * Clear all expired entries from cache
   */
  async clearExpired(): Promise<void> {
    try {
      const db = await this.getDB()
      const now = Date.now()
      const expirationThreshold = now - CACHE_EXPIRATION_MS
      const tokenExpirationThreshold = now - TOKEN_METADATA_EXPIRATION_MS

      // Clear expired ABIs
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_ABIS, 'readwrite')
        const store = transaction.objectStore(STORE_ABIS)
        const index = store.index('timestamp')
        const range = IDBKeyRange.upperBound(expirationThreshold)
        const request = index.openCursor(range)

        request.onsuccess = () => {
          const cursor = request.result
          if (cursor) {
            cursor.delete()
            cursor.continue()
          } else {
            resolve()
          }
        }

        request.onerror = () => reject(request.error)
      })

      // Clear expired contract names
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_CONTRACT_NAMES, 'readwrite')
        const store = transaction.objectStore(STORE_CONTRACT_NAMES)
        const index = store.index('timestamp')
        const range = IDBKeyRange.upperBound(expirationThreshold)
        const request = index.openCursor(range)

        request.onsuccess = () => {
          const cursor = request.result
          if (cursor) {
            cursor.delete()
            cursor.continue()
          } else {
            resolve()
          }
        }

        request.onerror = () => reject(request.error)
      })

      // Clear expired token metadata
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_TOKEN_METADATA, 'readwrite')
        const store = transaction.objectStore(STORE_TOKEN_METADATA)
        const index = store.index('timestamp')
        const range = IDBKeyRange.upperBound(tokenExpirationThreshold)
        const request = index.openCursor(range)

        request.onsuccess = () => {
          const cursor = request.result
          if (cursor) {
            cursor.delete()
            cursor.continue()
          } else {
            resolve()
          }
        }

        request.onerror = () => reject(request.error)
      })

      console.log('Cleared expired cache entries')
    } catch (error) {
      console.warn('Failed to clear expired cache:', error)
    }
  }

  /**
   * Clear all cache data
   */
  async clearAll(): Promise<void> {
    try {
      const db = await this.getDB()

      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(
          [STORE_ABIS, STORE_CONTRACT_NAMES, STORE_TOKEN_METADATA],
          'readwrite'
        )
        const abiStore = transaction.objectStore(STORE_ABIS)
        const nameStore = transaction.objectStore(STORE_CONTRACT_NAMES)
        const tokenStore = transaction.objectStore(STORE_TOKEN_METADATA)

        const abiRequest = abiStore.clear()
        const nameRequest = nameStore.clear()
        const tokenRequest = tokenStore.clear()

        transaction.oncomplete = () => {
          console.log('Cleared all cache data')
          resolve()
        }

        transaction.onerror = () => {
          reject(transaction.error)
        }

        abiRequest.onerror = () => reject(abiRequest.error)
        nameRequest.onerror = () => reject(nameRequest.error)
        tokenRequest.onerror = () => reject(tokenRequest.error)
      })
    } catch (error) {
      console.warn('Failed to clear cache:', error)
    }
  }
}

// Singleton instance
let cacheInstance: IndexedDBCache | null = null

/**
 * Get the singleton cache instance
 */
export function getCache(): IndexedDBCache {
  if (!cacheInstance) {
    cacheInstance = new IndexedDBCache()
  }
  return cacheInstance
}
