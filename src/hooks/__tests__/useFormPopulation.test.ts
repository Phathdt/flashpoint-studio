import { describe, it, expect, vi, beforeEach } from 'vitest'
import { populateFormFields } from '../useFormPopulation'
import { InputMode } from '@/lib/constants'
import type { PopulationData } from '../useFormPopulation'

describe('populateFormFields', () => {
  let mockSetValue: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockSetValue = vi.fn()
  })

  describe('Common Fields', () => {
    it('should populate rpcUrl', () => {
      const data: PopulationData = {
        rpcUrl: 'https://eth.llamarpc.com',
      }

      populateFormFields(mockSetValue, data, InputMode.MANUAL)

      expect(mockSetValue).toHaveBeenCalledWith('rpcUrl', 'https://eth.llamarpc.com')
    })

    it('should populate blockNumber', () => {
      const data: PopulationData = {
        blockNumber: '12345',
      }

      populateFormFields(mockSetValue, data, InputMode.MANUAL)

      expect(mockSetValue).toHaveBeenCalledWith('blockNumber', '12345')
    })

    it('should populate apiEtherscanUrl', () => {
      const data: PopulationData = {
        apiEtherscanUrl: 'https://api.etherscan.io',
      }

      populateFormFields(mockSetValue, data, InputMode.MANUAL)

      expect(mockSetValue).toHaveBeenCalledWith('apiEtherscanUrl', 'https://api.etherscan.io')
    })

    it('should populate etherscanUrl', () => {
      const data: PopulationData = {
        etherscanUrl: 'https://etherscan.io',
      }

      populateFormFields(mockSetValue, data, InputMode.MANUAL)

      expect(mockSetValue).toHaveBeenCalledWith('etherscanUrl', 'https://etherscan.io')
    })

    it('should populate etherscanApiKey', () => {
      const data: PopulationData = {
        etherscanApiKey: 'test-key',
      }

      populateFormFields(mockSetValue, data, InputMode.MANUAL)

      expect(mockSetValue).toHaveBeenCalledWith('etherscanApiKey', 'test-key')
    })

    it('should populate all common fields', () => {
      const data: PopulationData = {
        rpcUrl: 'https://eth.llamarpc.com',
        blockNumber: '12345',
        apiEtherscanUrl: 'https://api.etherscan.io',
        etherscanUrl: 'https://etherscan.io',
        etherscanApiKey: 'test-key',
      }

      populateFormFields(mockSetValue, data, InputMode.MANUAL)

      expect(mockSetValue).toHaveBeenCalledTimes(5)
      expect(mockSetValue).toHaveBeenCalledWith('rpcUrl', 'https://eth.llamarpc.com')
      expect(mockSetValue).toHaveBeenCalledWith('blockNumber', '12345')
      expect(mockSetValue).toHaveBeenCalledWith('apiEtherscanUrl', 'https://api.etherscan.io')
      expect(mockSetValue).toHaveBeenCalledWith('etherscanUrl', 'https://etherscan.io')
      expect(mockSetValue).toHaveBeenCalledWith('etherscanApiKey', 'test-key')
    })

    it('should skip undefined common fields', () => {
      const data: PopulationData = {
        rpcUrl: 'https://eth.llamarpc.com',
      }

      populateFormFields(mockSetValue, data, InputMode.MANUAL)

      expect(mockSetValue).toHaveBeenCalledTimes(1)
      expect(mockSetValue).toHaveBeenCalledWith('rpcUrl', 'https://eth.llamarpc.com')
    })
  })

  describe('Manual Mode', () => {
    it('should populate manual mode fields', () => {
      const data: PopulationData = {
        fromAddress: '0xabc',
        toAddress: '0xdef',
        payload: '0x123456',
      }

      populateFormFields(mockSetValue, data, InputMode.MANUAL)

      expect(mockSetValue).toHaveBeenCalledWith('fromAddress', '0xabc')
      expect(mockSetValue).toHaveBeenCalledWith('toAddress', '0xdef')
      expect(mockSetValue).toHaveBeenCalledWith('payload', '0x123456')
    })

    it('should populate all manual mode fields with common fields', () => {
      const data: PopulationData = {
        rpcUrl: 'https://eth.llamarpc.com',
        blockNumber: '12345',
        fromAddress: '0xabc',
        toAddress: '0xdef',
        payload: '0x123456',
      }

      populateFormFields(mockSetValue, data, InputMode.MANUAL)

      expect(mockSetValue).toHaveBeenCalledTimes(5)
    })

    it('should not populate txHash in manual mode', () => {
      const data: PopulationData = {
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        fromAddress: '0xabc',
      }

      populateFormFields(mockSetValue, data, InputMode.MANUAL)

      expect(mockSetValue).not.toHaveBeenCalledWith('txHash', expect.anything())
      expect(mockSetValue).toHaveBeenCalledWith('fromAddress', '0xabc')
    })

    it('should skip undefined manual fields', () => {
      const data: PopulationData = {
        fromAddress: '0xabc',
      }

      populateFormFields(mockSetValue, data, InputMode.MANUAL)

      expect(mockSetValue).toHaveBeenCalledTimes(1)
      expect(mockSetValue).toHaveBeenCalledWith('fromAddress', '0xabc')
    })
  })

  describe('Transaction Hash Mode', () => {
    it('should populate txHash in txHash mode', () => {
      const data: PopulationData = {
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      }

      populateFormFields(mockSetValue, data, InputMode.TX_HASH)

      expect(mockSetValue).toHaveBeenCalledWith(
        'txHash',
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      )
    })

    it('should populate txHash with common fields', () => {
      const data: PopulationData = {
        rpcUrl: 'https://eth.llamarpc.com',
        blockNumber: '12345',
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      }

      populateFormFields(mockSetValue, data, InputMode.TX_HASH)

      expect(mockSetValue).toHaveBeenCalledTimes(3)
      expect(mockSetValue).toHaveBeenCalledWith('rpcUrl', 'https://eth.llamarpc.com')
      expect(mockSetValue).toHaveBeenCalledWith('blockNumber', '12345')
      expect(mockSetValue).toHaveBeenCalledWith(
        'txHash',
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      )
    })

    it('should not populate manual fields in txHash mode', () => {
      const data: PopulationData = {
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        fromAddress: '0xabc',
        toAddress: '0xdef',
        payload: '0x123456',
      }

      populateFormFields(mockSetValue, data, InputMode.TX_HASH)

      expect(mockSetValue).toHaveBeenCalledTimes(1)
      expect(mockSetValue).toHaveBeenCalledWith(
        'txHash',
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      )
      expect(mockSetValue).not.toHaveBeenCalledWith('fromAddress', expect.anything())
      expect(mockSetValue).not.toHaveBeenCalledWith('toAddress', expect.anything())
      expect(mockSetValue).not.toHaveBeenCalledWith('payload', expect.anything())
    })

    it('should not populate if txHash is undefined', () => {
      const data: PopulationData = {
        rpcUrl: 'https://eth.llamarpc.com',
      }

      populateFormFields(mockSetValue, data, InputMode.TX_HASH)

      expect(mockSetValue).toHaveBeenCalledTimes(1)
      expect(mockSetValue).toHaveBeenCalledWith('rpcUrl', 'https://eth.llamarpc.com')
      expect(mockSetValue).not.toHaveBeenCalledWith('txHash', expect.anything())
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty data object', () => {
      const data: PopulationData = {}

      populateFormFields(mockSetValue, data, InputMode.MANUAL)

      expect(mockSetValue).not.toHaveBeenCalled()
    })

    it('should handle empty strings', () => {
      const data: PopulationData = {
        rpcUrl: '',
        fromAddress: '',
      }

      populateFormFields(mockSetValue, data, InputMode.MANUAL)

      // Empty strings are falsy, so they should not be set
      expect(mockSetValue).not.toHaveBeenCalled()
    })

    it('should handle null inputMode in data', () => {
      const data: PopulationData = {
        inputMode: undefined,
        rpcUrl: 'https://eth.llamarpc.com',
      }

      populateFormFields(mockSetValue, data, InputMode.MANUAL)

      expect(mockSetValue).toHaveBeenCalledWith('rpcUrl', 'https://eth.llamarpc.com')
    })

    it('should work with different form types', () => {
      interface CustomForm {
        rpcUrl: string
        customField: string
      }

      const customSetValue = vi.fn<[path: keyof CustomForm, value: string], void>()

      const data: PopulationData = {
        rpcUrl: 'https://eth.llamarpc.com',
      }

      populateFormFields<CustomForm>(customSetValue as never, data, InputMode.MANUAL)

      expect(customSetValue).toHaveBeenCalledWith('rpcUrl', 'https://eth.llamarpc.com')
    })

    it('should handle all fields with empty strings', () => {
      const data: PopulationData = {
        rpcUrl: '',
        blockNumber: '',
        fromAddress: '',
        toAddress: '',
        payload: '',
        apiEtherscanUrl: '',
        etherscanUrl: '',
        etherscanApiKey: '',
      }

      populateFormFields(mockSetValue, data, InputMode.MANUAL)

      expect(mockSetValue).not.toHaveBeenCalled()
    })

    it('should prioritize mode-specific logic over data fields', () => {
      const data: PopulationData = {
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        fromAddress: '0xabc',
        payload: '0x123456',
      }

      // Even though data has manual fields, they should not be populated in txHash mode
      populateFormFields(mockSetValue, data, InputMode.TX_HASH)

      expect(mockSetValue).toHaveBeenCalledTimes(1)
      expect(mockSetValue).toHaveBeenCalledWith(
        'txHash',
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      )
    })
  })
})
