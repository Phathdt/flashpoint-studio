import { ethers } from 'ethers'

/**
 * Decoded function information
 */
export interface DecodedFunction {
  signature: string // e.g., "swap(uint256,uint256,address,bytes)"
  name: string // e.g., "swap"
  selector: string // e.g., "0x12345678"
}

/**
 * Decoded error information
 */
export interface DecodedError {
  signature: string // e.g., "InsufficientBalance(uint256,uint256)"
  name: string // e.g., "InsufficientBalance"
  selector: string // e.g., "0x12345678"
  args?: unknown[] // Decoded error arguments
}

/**
 * Utility for decoding function selectors using contract ABIs
 */
export class FunctionDecoder {
  private selectorCache: Map<string, DecodedFunction> = new Map()
  private errorCache: Map<string, DecodedError> = new Map()
  private interfaces: ethers.Interface[] = []

  constructor(abis: ethers.InterfaceAbi[] = []) {
    this.addAbis(abis)
  }

  /**
   * Add additional ABIs for function decoding
   */
  addAbis(abis: ethers.InterfaceAbi[]): void {
    for (const abi of abis) {
      try {
        const iface = new ethers.Interface(abi)
        this.interfaces.push(iface)

        // Pre-populate cache with all function signatures
        iface.forEachFunction((func) => {
          const selector = func.selector.toLowerCase()
          this.selectorCache.set(selector, {
            signature: func.format('full'),
            name: func.name,
            selector: func.selector,
          })
        })

        // Pre-populate cache with all custom error signatures
        iface.forEachError((error) => {
          const selector = error.selector.toLowerCase()
          this.errorCache.set(selector, {
            signature: error.format('full'),
            name: error.name,
            selector: error.selector,
          })
        })
      } catch (error) {
        console.warn(
          `Failed to parse ABI: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }

    if (this.selectorCache.size > 0 || this.errorCache.size > 0) {
      console.debug(
        `Function decoder cache populated with ${this.selectorCache.size} function(s) and ${this.errorCache.size} error(s)`
      )
    }
  }

  /**
   * Decode a function selector (4-byte signature)
   * Returns the function signature or the hex selector if not found
   */
  decode(selector: string): DecodedFunction {
    // Normalize selector (ensure 0x prefix and lowercase)
    const normalizedSelector = selector.toLowerCase().startsWith('0x')
      ? selector.toLowerCase()
      : `0x${selector.toLowerCase()}`

    // Check cache first
    const cached = this.selectorCache.get(normalizedSelector)
    if (cached) {
      return cached
    }

    // Try to decode using loaded interfaces
    for (const iface of this.interfaces) {
      try {
        const fragment = iface.getFunction(normalizedSelector)
        if (fragment) {
          const decoded: DecodedFunction = {
            signature: fragment.format('full'),
            name: fragment.name,
            selector: normalizedSelector,
          }

          // Cache for future use
          this.selectorCache.set(normalizedSelector, decoded)
          return decoded
        }
      } catch {
        // Continue to next interface
      }
    }

    // Return the hex selector if not found
    return {
      signature: normalizedSelector,
      name: 'Unknown',
      selector: normalizedSelector,
    }
  }

  /**
   * Decode function calldata (selector + parameters)
   * Returns the function signature and attempts to decode parameters
   */
  decodeCalldata(calldata: string): {
    function: DecodedFunction
    params?: unknown[]
    paramNames?: string[]
    paramTypes?: readonly ethers.ParamType[]
  } {
    if (!calldata || calldata === '0x' || calldata.length < 10) {
      return {
        function: {
          signature: 'fallback()',
          name: 'fallback',
          selector: '0x',
        },
      }
    }

    // Extract selector (first 4 bytes = 8 hex chars + 0x)
    const selector = calldata.slice(0, 10)
    const decodedFunction = this.decode(selector)

    // Try to decode parameters if we have the ABI
    try {
      for (const iface of this.interfaces) {
        try {
          const fragment = iface.getFunction(selector)
          if (fragment) {
            const decoded = iface.decodeFunctionData(fragment, calldata)
            const paramNames = fragment.inputs.map((input) => input.name || `param${input.name}`)
            return {
              function: decodedFunction,
              params: Array.from(decoded),
              paramNames,
              paramTypes: fragment.inputs,
            }
          }
        } catch {
          // Continue to next interface
        }
      }
    } catch (error) {
      console.debug(
        `Failed to decode calldata parameters: ${error instanceof Error ? error.message : String(error)}`
      )
    }

    // Return without parameters if decoding failed
    return {
      function: decodedFunction,
    }
  }

  /**
   * Decode a custom error from error data
   * Returns the error signature and decoded arguments
   */
  decodeError(errorData: string): DecodedError {
    if (!errorData || errorData === '0x' || errorData.length < 10) {
      return {
        signature: 'Unknown error',
        name: 'Unknown',
        selector: '0x',
      }
    }

    // Extract selector (first 4 bytes = 8 hex chars + 0x)
    const selector = errorData.slice(0, 10).toLowerCase()

    // Check cache first
    const cached = this.errorCache.get(selector)
    if (cached) {
      // Try to decode arguments
      try {
        for (const iface of this.interfaces) {
          try {
            const fragment = iface.getError(selector)
            if (fragment) {
              const decoded = iface.decodeErrorResult(fragment, errorData)
              return {
                signature: fragment.format('full'),
                name: fragment.name,
                selector: fragment.selector,
                args: Array.from(decoded),
              }
            }
          } catch {
            // Continue to next interface
          }
        }
      } catch (error) {
        console.debug(
          `Failed to decode error arguments: ${error instanceof Error ? error.message : String(error)}`
        )
      }

      return cached
    }

    // Try to decode using loaded interfaces
    for (const iface of this.interfaces) {
      try {
        const fragment = iface.getError(selector)
        if (fragment) {
          try {
            const decoded = iface.decodeErrorResult(fragment, errorData)
            const decodedError: DecodedError = {
              signature: fragment.format('full'),
              name: fragment.name,
              selector: fragment.selector,
              args: Array.from(decoded),
            }

            // Cache for future use
            this.errorCache.set(selector, decodedError)
            return decodedError
          } catch {
            // Return without args if decoding failed
            const decodedError: DecodedError = {
              signature: fragment.format('full'),
              name: fragment.name,
              selector: fragment.selector,
            }

            this.errorCache.set(selector, decodedError)
            return decodedError
          }
        }
      } catch {
        // Continue to next interface
      }
    }

    // Return the hex selector if not found
    return {
      signature: selector,
      name: 'Unknown',
      selector: selector,
    }
  }

  /**
   * Decode function output/return data
   * @param calldata Original function calldata (to identify the function)
   * @param outputData The output/return data from the call
   * @returns Decoded output values or null if decoding fails
   */
  decodeOutput(
    calldata: string,
    outputData: string
  ): { values: unknown[]; names: string[]; types: readonly ethers.ParamType[] } | null {
    if (!calldata || calldata.length < 10 || !outputData || outputData === '0x') {
      return null
    }

    // Extract selector from calldata
    const selector = calldata.slice(0, 10)

    // Try to decode using loaded interfaces
    for (const iface of this.interfaces) {
      try {
        const fragment = iface.getFunction(selector)
        if (fragment) {
          const decoded = iface.decodeFunctionResult(fragment, outputData)
          const outputNames = fragment.outputs.map(
            (output, index) => output.name || `output${index}`
          )
          return {
            values: Array.from(decoded),
            names: outputNames,
            types: fragment.outputs,
          }
        }
      } catch (error) {
        // Continue to next interface
        console.debug(
          `Failed to decode output for ${selector}: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }

    return null
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    functionCount: number
    errorCount: number
    interfaces: number
  } {
    return {
      functionCount: this.selectorCache.size,
      errorCount: this.errorCache.size,
      interfaces: this.interfaces.length,
    }
  }
}
