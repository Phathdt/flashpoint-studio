import type { CallFrame } from './types'
import { FunctionDecoder } from './function-decoder'
import { ethers } from 'ethers'

/**
 * Parsed call frame with decoded information
 */
export interface ParsedCallFrame {
  type: string
  from: string
  to: string
  value: bigint
  gas: bigint
  gasUsed: bigint
  gasPercentage: number
  functionSignature: string
  functionName: string
  input: string
  decodedInput?: unknown[] // Decoded input arguments
  inputParamNames?: string[] // Parameter names for inputs
  inputParamTypes?: readonly ethers.ParamType[] // Parameter types for inputs (for struct detection)
  output?: string
  decodedOutput?: unknown[] // Decoded return values
  outputParamNames?: string[] // Parameter names for outputs
  outputParamTypes?: readonly ethers.ParamType[] // Parameter types for outputs (for struct detection)
  error?: string
  revertReason?: string
  decodedError?: {
    name: string
    signature: string
    args?: unknown[]
  }
  calls: ParsedCallFrame[]
  depth: number
}

/**
 * Statistics about the trace execution
 */
export interface TraceStats {
  totalGasUsed: bigint
  totalCalls: number
  maxDepth: number
  hasError: boolean
  errorMessage?: string
}

/**
 * Parser for converting raw call frames into structured data
 */
export class TraceParser {
  private functionDecoder: FunctionDecoder

  constructor(functionDecoder: FunctionDecoder) {
    this.functionDecoder = functionDecoder
  }

  /**
   * Parse a raw call frame into a structured format
   */
  parseCallFrame(frame: CallFrame, depth: number = 0): ParsedCallFrame {
    // Decode function from input data
    const decoded = this.functionDecoder.decodeCalldata(frame.input)

    // Parse hex values to bigint
    const gas = BigInt(frame.gas)
    const gasUsed = BigInt(frame.gasUsed)
    const value = frame.value ? BigInt(frame.value) : BigInt(0)

    // Calculate gas percentage
    const gasPercentage = gas > 0 ? Number((gasUsed * BigInt(10000)) / gas) / 100 : 0

    // Decode custom error if present in output
    let decodedError: { name: string; signature: string; args?: unknown[] } | undefined
    let decodedOutput: unknown[] | undefined
    let outputParamNames: string[] | undefined
    let outputParamTypes: readonly ethers.ParamType[] | undefined

    if (frame.output && frame.output !== '0x' && frame.output.length >= 10) {
      // Try to decode as error first
      const errorDecoded = this.functionDecoder.decodeError(frame.output)
      if (errorDecoded.name !== 'Unknown') {
        decodedError = {
          name: errorDecoded.name,
          signature: errorDecoded.signature,
          args: errorDecoded.args,
        }
      } else if (!frame.error && !frame.revertReason) {
        // If not an error, try to decode as function output
        const outputDecoded = this.functionDecoder.decodeOutput(frame.input, frame.output)
        if (outputDecoded && outputDecoded.values.length > 0) {
          decodedOutput = outputDecoded.values
          outputParamNames = outputDecoded.names
          outputParamTypes = outputDecoded.types
        }
      }
    }

    // Parse nested calls recursively
    const calls = (frame.calls || []).map((call) => this.parseCallFrame(call, depth + 1))

    return {
      type: frame.type,
      from: frame.from,
      to: frame.to || '0x0000000000000000000000000000000000000000',
      value,
      gas,
      gasUsed,
      gasPercentage,
      functionSignature: decoded.function.signature,
      functionName: decoded.function.name,
      input: frame.input,
      decodedInput: decoded.params,
      inputParamNames: decoded.paramNames,
      inputParamTypes: decoded.paramTypes,
      output: frame.output,
      decodedOutput,
      outputParamNames,
      outputParamTypes,
      error: frame.error,
      revertReason: frame.revertReason,
      decodedError,
      calls,
      depth,
    }
  }

  /**
   * Calculate statistics from a parsed call frame
   */
  calculateStats(frame: ParsedCallFrame): TraceStats {
    const totalGasUsed = frame.gasUsed
    let totalCalls = 1
    let maxDepth = frame.depth
    let hasError = !!frame.error
    let errorMessage = frame.error || frame.revertReason

    // Recursively process nested calls
    const processFrame = (f: ParsedCallFrame) => {
      for (const call of f.calls) {
        totalCalls++
        maxDepth = Math.max(maxDepth, call.depth)
        if (call.error) {
          hasError = true
          errorMessage = errorMessage || call.error || call.revertReason
        }
        processFrame(call)
      }
    }

    processFrame(frame)

    return {
      totalGasUsed,
      totalCalls,
      maxDepth: maxDepth + 1, // Convert 0-indexed to count
      hasError,
      errorMessage,
    }
  }

  /**
   * Parse and analyze a call frame with statistics
   */
  parse(frame: CallFrame): {
    parsed: ParsedCallFrame
    stats: TraceStats
  } {
    const parsed = this.parseCallFrame(frame)
    const stats = this.calculateStats(parsed)

    return { parsed, stats }
  }
}
