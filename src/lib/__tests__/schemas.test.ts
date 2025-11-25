import { describe, it, expect } from 'vitest'
import { evmTracingSchema } from '../schemas'
import { InputMode } from '../constants'

describe('evmTracingSchema', () => {
  describe('Manual Mode Schema', () => {
    it('should validate correct manual mode data', () => {
      const validData = {
        inputMode: InputMode.MANUAL,
        rpcUrl: 'https://eth.llamarpc.com',
        payload: '0x123456',
        fromAddress: '0x1234567890123456789012345678901234567890',
        toAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      }

      const result = evmTracingSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate manual mode with optional block number', () => {
      const validData = {
        inputMode: InputMode.MANUAL,
        rpcUrl: 'https://eth.llamarpc.com',
        payload: '0x123456',
        fromAddress: '0x1234567890123456789012345678901234567890',
        toAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        blockNumber: '12345',
      }

      const result = evmTracingSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate manual mode with hex block number', () => {
      const validData = {
        inputMode: InputMode.MANUAL,
        rpcUrl: 'https://eth.llamarpc.com',
        payload: '0x123456',
        fromAddress: '0x1234567890123456789012345678901234567890',
        toAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        blockNumber: '0x3039',
      }

      const result = evmTracingSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate manual mode with all optional fields', () => {
      const validData = {
        inputMode: InputMode.MANUAL,
        rpcUrl: 'https://eth.llamarpc.com',
        payload: '0x123456',
        fromAddress: '0x1234567890123456789012345678901234567890',
        toAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        blockNumber: '12345',
        apiEtherscanUrl: 'https://api.etherscan.io',
        etherscanUrl: 'https://etherscan.io',
        etherscanApiKey: 'test-key',
      }

      const result = evmTracingSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject manual mode with missing payload', () => {
      const invalidData = {
        inputMode: InputMode.MANUAL,
        rpcUrl: 'https://eth.llamarpc.com',
        fromAddress: '0x1234567890123456789012345678901234567890',
        toAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      }

      const result = evmTracingSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject manual mode with empty payload', () => {
      const invalidData = {
        inputMode: InputMode.MANUAL,
        rpcUrl: 'https://eth.llamarpc.com',
        payload: '',
        fromAddress: '0x1234567890123456789012345678901234567890',
        toAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      }

      const result = evmTracingSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject manual mode with invalid fromAddress', () => {
      const invalidData = {
        inputMode: InputMode.MANUAL,
        rpcUrl: 'https://eth.llamarpc.com',
        payload: '0x123456',
        fromAddress: '0xinvalid',
        toAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      }

      const result = evmTracingSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject manual mode with invalid toAddress', () => {
      const invalidData = {
        inputMode: InputMode.MANUAL,
        rpcUrl: 'https://eth.llamarpc.com',
        payload: '0x123456',
        fromAddress: '0x1234567890123456789012345678901234567890',
        toAddress: '0xinvalid',
      }

      const result = evmTracingSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject manual mode with fromAddress without 0x prefix', () => {
      const invalidData = {
        inputMode: InputMode.MANUAL,
        rpcUrl: 'https://eth.llamarpc.com',
        payload: '0x123456',
        fromAddress: '1234567890123456789012345678901234567890',
        toAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      }

      const result = evmTracingSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject manual mode with invalid block number format', () => {
      const invalidData = {
        inputMode: InputMode.MANUAL,
        rpcUrl: 'https://eth.llamarpc.com',
        payload: '0x123456',
        fromAddress: '0x1234567890123456789012345678901234567890',
        toAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        blockNumber: 'invalid',
      }

      const result = evmTracingSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject manual mode with invalid RPC URL', () => {
      const invalidData = {
        inputMode: InputMode.MANUAL,
        rpcUrl: 'not-a-url',
        payload: '0x123456',
        fromAddress: '0x1234567890123456789012345678901234567890',
        toAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      }

      const result = evmTracingSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject manual mode with invalid apiEtherscanUrl', () => {
      const invalidData = {
        inputMode: InputMode.MANUAL,
        rpcUrl: 'https://eth.llamarpc.com',
        payload: '0x123456',
        fromAddress: '0x1234567890123456789012345678901234567890',
        toAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        apiEtherscanUrl: 'not-a-url',
      }

      const result = evmTracingSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should accept manual mode with empty etherscan URLs', () => {
      const validData = {
        inputMode: InputMode.MANUAL,
        rpcUrl: 'https://eth.llamarpc.com',
        payload: '0x123456',
        fromAddress: '0x1234567890123456789012345678901234567890',
        toAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        apiEtherscanUrl: '',
        etherscanUrl: '',
      }

      const result = evmTracingSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('Transaction Hash Mode Schema', () => {
    it('should validate correct txHash mode data', () => {
      const validData = {
        inputMode: InputMode.TX_HASH,
        rpcUrl: 'https://eth.llamarpc.com',
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        blockNumber: '12345',
      }

      const result = evmTracingSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate txHash mode with hex block number', () => {
      const validData = {
        inputMode: InputMode.TX_HASH,
        rpcUrl: 'https://eth.llamarpc.com',
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        blockNumber: '0x3039',
      }

      const result = evmTracingSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate txHash mode with all optional fields', () => {
      const validData = {
        inputMode: InputMode.TX_HASH,
        rpcUrl: 'https://eth.llamarpc.com',
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        blockNumber: '12345',
        apiEtherscanUrl: 'https://api.etherscan.io',
        etherscanUrl: 'https://etherscan.io',
        etherscanApiKey: 'test-key',
      }

      const result = evmTracingSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject txHash mode with missing txHash', () => {
      const invalidData = {
        inputMode: InputMode.TX_HASH,
        rpcUrl: 'https://eth.llamarpc.com',
        blockNumber: '12345',
      }

      const result = evmTracingSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject txHash mode with missing blockNumber', () => {
      const invalidData = {
        inputMode: InputMode.TX_HASH,
        rpcUrl: 'https://eth.llamarpc.com',
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      }

      const result = evmTracingSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject txHash mode with empty blockNumber', () => {
      const invalidData = {
        inputMode: InputMode.TX_HASH,
        rpcUrl: 'https://eth.llamarpc.com',
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        blockNumber: '',
      }

      const result = evmTracingSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject txHash mode with invalid txHash format (too short)', () => {
      const invalidData = {
        inputMode: InputMode.TX_HASH,
        rpcUrl: 'https://eth.llamarpc.com',
        txHash: '0x1234',
        blockNumber: '12345',
      }

      const result = evmTracingSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject txHash mode with txHash without 0x prefix', () => {
      const invalidData = {
        inputMode: InputMode.TX_HASH,
        rpcUrl: 'https://eth.llamarpc.com',
        txHash: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        blockNumber: '12345',
      }

      const result = evmTracingSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject txHash mode with invalid block number format', () => {
      const invalidData = {
        inputMode: InputMode.TX_HASH,
        rpcUrl: 'https://eth.llamarpc.com',
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        blockNumber: 'invalid',
      }

      const result = evmTracingSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should accept txHash mode with uppercase hash', () => {
      const validData = {
        inputMode: InputMode.TX_HASH,
        rpcUrl: 'https://eth.llamarpc.com',
        txHash: '0x1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF',
        blockNumber: '12345',
      }

      const result = evmTracingSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept txHash mode with mixed case hash', () => {
      const validData = {
        inputMode: InputMode.TX_HASH,
        rpcUrl: 'https://eth.llamarpc.com',
        txHash: '0x1234567890AbCdEf1234567890AbCdEf1234567890AbCdEf1234567890AbCdEf',
        blockNumber: '12345',
      }

      const result = evmTracingSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should not require manual mode fields in txHash mode', () => {
      const validData = {
        inputMode: InputMode.TX_HASH,
        rpcUrl: 'https://eth.llamarpc.com',
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        blockNumber: '12345',
        // No payload, fromAddress, toAddress
      }

      const result = evmTracingSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('Discriminated Union', () => {
    it('should use inputMode as discriminator', () => {
      const invalidData = {
        inputMode: 'invalid-mode',
        rpcUrl: 'https://eth.llamarpc.com',
      }

      const result = evmTracingSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should require inputMode field', () => {
      const invalidData = {
        rpcUrl: 'https://eth.llamarpc.com',
        payload: '0x123456',
        fromAddress: '0x1234567890123456789012345678901234567890',
        toAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      }

      const result = evmTracingSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})
