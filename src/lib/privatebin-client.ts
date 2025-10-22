/**
 * PrivateBin Client for sharing transaction data with end-to-end encryption
 * Uses: https://github.com/pixelfactoryio/privatebin-cli
 */

import { PrivatebinClient } from '@pixelfactory/privatebin'
import bs58 from 'bs58'

export interface ShareableData {
  // Transaction inputs
  payload: string
  fromAddress: string
  toAddress: string

  // Simulation result (if available)
  simulationResult?: {
    success: boolean
    trace?: any
    parsedTrace?: {
      frame: any
      stats: any
    }
    contractNames?: Record<string, string> // Convert Map to object for JSON serialization
    chainId?: number
    etherscanUrl?: string
    error?: string
    errorDetails?: {
      type: string
      name?: string
      reason?: string
      args?: unknown[]
      signature?: string
    }
  }
}

export interface PrivateBinResponse {
  url: string
  deleteToken: string
}

export class PrivateBinShareClient {
  private static readonly PRIVATEBIN_URL = 'https://privatebin.net'
  private privatebinClient: PrivatebinClient

  constructor() {
    this.privatebinClient = new PrivatebinClient(PrivateBinShareClient.PRIVATEBIN_URL)
  }

  /**
   * Convert BigInt values to strings for JSON serialization
   */
  private serializeBigInt(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj
    }

    if (typeof obj === 'bigint') {
      return obj.toString()
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.serializeBigInt(item))
    }

    if (typeof obj === 'object') {
      const result: any = {}
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          result[key] = this.serializeBigInt(obj[key])
        }
      }
      return result
    }

    return obj
  }

  /**
   * Create a PrivateBin paste with transaction data
   * Returns URL with encryption key in the hash
   */
  async createPaste(data: ShareableData): Promise<PrivateBinResponse> {
    try {
      // Generate a random encryption key
      const key = crypto.getRandomValues(new Uint8Array(32))

      // Serialize data to handle BigInt values
      const serializedData = this.serializeBigInt(data)

      // Prepare the message
      const message = JSON.stringify(serializedData, null, 2)

      // Configure paste options - simple: 1 day expiry, text format
      const opts = {
        textformat: 'plaintext' as const,
        expire: '1day' as const,
        burnafterreading: 0 as const,
        opendiscussion: 0 as const,
        output: 'text' as const,
        compression: 'zlib' as const,
      }

      // Send the paste
      const result = await this.privatebinClient.sendText(message, key, opts)

      // Extract paste ID from result.url (e.g., "/?abc123" -> "abc123")
      const pasteId = result.url.replace(/^\/\?/, '')

      // Create compact format: pasteId#key
      const compactUrl = `${pasteId}#${bs58.encode(key)}`

      return {
        url: compactUrl,
        deleteToken: result.deletetoken || '',
      }
    } catch (error) {
      console.error('PrivateBin error:', error)
      throw new Error(
        `Failed to create PrivateBin paste: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Fetch transaction data from a PrivateBin paste
   * @param compactUrl Compact format: pasteId#key (e.g., "abc123#encodedKey")
   */
  async fetchPaste(compactUrl: string): Promise<ShareableData> {
    try {
      // Parse the compact format: pasteId#key
      const [pasteId, encodedKey] = compactUrl.split('#')

      if (!pasteId || !encodedKey) {
        throw new Error('Invalid share format. Expected: pasteId#key')
      }

      // Decode the key
      const key = bs58.decode(encodedKey)

      // Fetch the paste
      const result = await this.privatebinClient.getText(pasteId, key)

      // Parse the JSON data - result.paste contains the decrypted text
      const data = JSON.parse(result.paste)

      return data
    } catch (error) {
      console.error('PrivateBin fetch error:', error)
      throw new Error(
        `Failed to fetch PrivateBin paste: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Generate a shareable URL with compact share parameter
   * @param compactUrl Format: pasteId#key
   */
  generateShareableUrl(compactUrl: string, baseUrl: string = window.location.origin): string {
    const url = new URL(baseUrl)
    url.searchParams.set('share', compactUrl)
    return url.toString()
  }

  /**
   * Extract compact share URL from current URL parameters
   */
  getShareUrlFromParams(): string | null {
    const params = new URLSearchParams(window.location.search)
    return params.get('share')
  }

  /**
   * Convert compact URL to full PrivateBin URL
   * @param compactUrl Format: pasteId#key
   * @returns Full PrivateBin URL: https://privatebin.net/?pasteId#key
   */
  getPrivateBinUrl(compactUrl: string): string {
    return `${PrivateBinShareClient.PRIVATEBIN_URL}/?${compactUrl.replace('#', '#')}`
  }
}
