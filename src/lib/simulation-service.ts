import { ethers } from 'ethers'
import { TraceClient } from './trace-client'
import { EtherscanClient } from './etherscan-client'
import { FunctionDecoder } from './function-decoder'
import { TraceParser } from './trace-parser'
import { getEtherscanUrl } from './etherscan-utils'
import type { SimulationRequest, SimulationResult } from './types'

/**
 * Service for running EVM transaction simulations with tracing
 */
export class SimulationService {
  /**
   * Run a transaction simulation with optional tracing and ABI fetching
   */
  async simulate(request: SimulationRequest): Promise<SimulationResult> {
    try {
      console.log('Starting EVM call simulation...')
      console.log(`RPC URL: ${request.rpcUrl}`)
      console.log(`Contract Address: ${request.toAddress}`)
      console.log(`From Address: ${request.fromAddress}`)

      // Validate addresses
      if (!ethers.isAddress(request.fromAddress)) {
        throw new Error(`Invalid FROM_ADDRESS: ${request.fromAddress}`)
      }
      if (!ethers.isAddress(request.toAddress)) {
        throw new Error(`Invalid CONTRACT_ADDRESS: ${request.toAddress}`)
      }

      // Validate calldata
      if (!/^0x[a-fA-F0-9]*$/.test(request.payload)) {
        throw new Error(`Invalid calldata: ${request.payload}`)
      }

      // Create trace client
      const traceClient = new TraceClient(request.rpcUrl)
      const provider = traceClient.getProvider()

      // Connect to network
      console.log('Connecting to RPC...')
      const network = await provider.getNetwork()
      const chainId = Number(network.chainId)
      console.log(`✓ Connected to network: ${network.name} (Chain ID: ${chainId})`)

      const blockNumber = await provider.getBlockNumber()
      console.log(`Current block number: ${blockNumber}`)

      // Prepare transaction
      const tx = {
        to: request.toAddress,
        from: request.fromAddress,
        data: request.payload,
      }

      console.log('Simulating transaction...')

      // Determine Etherscan URL - use provided or auto-detect from chainId
      let etherscanUrl: string
      if (request.etherscanUrl) {
        etherscanUrl = request.etherscanUrl
        console.log(`Using custom Etherscan URL: ${etherscanUrl}`)
      } else {
        try {
          etherscanUrl = getEtherscanUrl(chainId)
          console.log(`Auto-detected Etherscan URL: ${etherscanUrl}`)
        } catch {
          throw new Error(
            `Chain ID ${chainId} is not supported. Please provide a custom Etherscan URL in the form.`
          )
        }
      }

      // Initialize Etherscan client
      const apiUrl = request.apiEtherscanUrl || 'https://api.etherscan.io/v2/api'
      console.log(`Using API Etherscan URL: ${apiUrl}`)

      const etherscanClient = new EtherscanClient({
        apiKey: request.etherscanApiKey || '',
        apiUrl: apiUrl,
        chainId: chainId,
      })

      // Execute trace
      console.log('Attempting to trace transaction...')
      const traceResult = await traceClient.traceCallSafe(tx, 'latest', {
        timeout: 10000,
      })

      if (traceResult) {
        console.log('✓ Trace execution completed')

        // Initialize function decoder and trace parser
        let functionDecoder = new FunctionDecoder([])
        let contractNames = new Map<string, string>()

        // Fetch ABIs from Etherscan
        const addresses = etherscanClient.extractAddressesFromTrace(traceResult)
        console.log(`Found ${addresses.length} unique contract address(es)`)

        if (addresses.length > 0) {
          console.log('Fetching ABIs and contract names from Etherscan...')
          await Promise.all([
            etherscanClient.fetchMultipleAbis(addresses),
            etherscanClient.fetchMultipleContractNames(addresses),
          ])

          // Get fetched ABIs and add to function decoder
          const fetchedAbis = etherscanClient.getAllCachedAbis()
          if (fetchedAbis.length > 0) {
            console.log(`✓ Successfully fetched ${fetchedAbis.length} ABI(s)`)
            functionDecoder = new FunctionDecoder(fetchedAbis)
          }

          // Get contract names
          contractNames = etherscanClient.getAllContractNames()
        }

        // Parse the trace
        const traceParser = new TraceParser(functionDecoder)
        const { parsed, stats } = traceParser.parse(traceResult)

        return {
          success: true,
          trace: traceResult,
          parsedTrace: { frame: parsed, stats },
          contractNames,
          chainId,
          etherscanUrl,
        }
      } else {
        // Fallback to standard call if tracing not supported
        console.warn('Trace not available, falling back to standard simulation')
        const result = await provider.call(tx)
        console.log('✓ Simulation successful!')
        console.log(`Return data: ${result}`)

        return {
          success: true,
          trace: undefined,
          error: 'Tracing not supported by RPC endpoint',
        }
      }
    } catch (error) {
      console.error('Simulation failed!', error)

      // Try to decode error
      let errorDetails
      if (error instanceof Error) {
        // Check for common error types
        if (error.message.includes('revert')) {
          errorDetails = {
            type: 'revert',
            reason: error.message,
          }
        } else if (error.message.includes('insufficient funds')) {
          errorDetails = {
            type: 'insufficient_funds',
            reason: 'The FROM_ADDRESS may not have enough funds for this transaction',
          }
        } else if (error.message.includes('nonce')) {
          errorDetails = {
            type: 'nonce',
            reason: 'There may be a nonce mismatch issue',
          }
        } else if (error.message.includes('gas')) {
          errorDetails = {
            type: 'gas',
            reason: 'The transaction may require more gas',
          }
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorDetails,
      }
    }
  }
}
