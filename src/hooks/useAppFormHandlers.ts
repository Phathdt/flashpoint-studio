import { useCallback } from 'react'
import type { UseFormGetValues } from 'react-hook-form'
import { toast } from 'sonner'
import { InputMode } from '@/lib/constants'
import { TransactionFetcher } from '@/lib/transaction-fetcher'
import { trackShare, trackFormAction } from '@/lib/analytics'
import type { SimulationResult, ApiExecutionStrategy } from '@/lib/types'
import type { FetchedTransactionData } from '@/hooks/types'

/**
 * Options for useAppFormHandlers hook
 */
export interface UseAppFormHandlersOptions<TFormData extends Record<string, unknown>> {
  getValues: UseFormGetValues<TFormData>
  simulate: (params: {
    rpcUrl: string
    payload: string
    fromAddress: string
    toAddress: string
    blockNumber?: string
    apiEtherscanUrl?: string
    etherscanUrl?: string
    etherscanApiKey?: string
    apiExecutionStrategy?: ApiExecutionStrategy
    apiRateLimit?: number
    inputMode?: InputMode
    txHash?: string
  }) => Promise<void>
  share: (data: {
    payload: string
    fromAddress: string
    toAddress: string
    blockNumber?: string
    apiEtherscanUrl?: string
    etherscanUrl?: string
    etherscanApiKey?: string
    result?: SimulationResult
    inputMode?: InputMode
    txHash?: string
  }) => Promise<void>
  copyToClipboard: (data: {
    rpcUrl: string
    payload: string
    fromAddress: string
    toAddress: string
    blockNumber?: string
    apiEtherscanUrl?: string
    etherscanUrl?: string
    etherscanApiKey?: string
    inputMode?: InputMode
    txHash?: string
  }) => Promise<void>
  pasteFromClipboard: () => Promise<unknown>
  saveFormData: (data: {
    rpcUrl?: string
    payload?: string
    fromAddress?: string
    toAddress?: string
    blockNumber?: string
    apiEtherscanUrl?: string
    etherscanUrl?: string
    etherscanApiKey?: string
    inputMode?: InputMode
    txHash?: string
  }) => void
  restoreFormData: () => boolean
  fetchedTxData: FetchedTransactionData | null
  simulationResult: SimulationResult | null
  apiExecutionStrategy?: ApiExecutionStrategy
  apiRateLimit?: number
}

/**
 * Return type for useAppFormHandlers hook
 */
export interface UseAppFormHandlersReturn<TFormData> {
  onSimulate: (data: TFormData) => Promise<void>
  onShare: () => Promise<void>
  onCopy: () => Promise<void>
  onPaste: () => Promise<void>
  onRestore: () => void
}

/**
 * Hook to manage all form action handlers (simulate, share, copy, paste, restore)
 * Extracts business logic from App component
 */
export function useAppFormHandlers<
  TFormData extends {
    inputMode: InputMode
    rpcUrl: string
    payload?: string
    fromAddress?: string
    toAddress?: string
    blockNumber?: string
    apiEtherscanUrl?: string
    etherscanUrl?: string
    etherscanApiKey?: string
    txHash?: string
  },
>(options: UseAppFormHandlersOptions<TFormData>): UseAppFormHandlersReturn<TFormData> {
  const {
    getValues,
    simulate,
    share,
    copyToClipboard,
    pasteFromClipboard,
    saveFormData,
    restoreFormData,
    fetchedTxData,
    simulationResult,
    apiExecutionStrategy,
    apiRateLimit,
  } = options

  /**
   * Handle form submission and simulation
   */
  const onSimulate = useCallback(
    async (data: TFormData) => {
      // Prepare simulation parameters based on mode
      let payload: string
      let fromAddress: string
      let toAddress: string
      let blockNumber: string | undefined

      if (data.inputMode === InputMode.TX_HASH && fetchedTxData) {
        // Use fetched transaction data
        const formatted = TransactionFetcher.formatTransactionData(fetchedTxData)
        payload = formatted.payload
        fromAddress = formatted.from
        toAddress = formatted.to
        blockNumber = formatted.blockNumber
      } else if (data.inputMode === InputMode.MANUAL) {
        // Use manually entered data
        payload = data.payload || ''
        fromAddress = data.fromAddress || ''
        toAddress = data.toAddress || ''
        blockNumber = data.blockNumber
      } else {
        toast.error('Invalid form state', {
          description: 'Please fetch transaction details first',
        })
        return
      }

      await simulate({
        rpcUrl: data.rpcUrl,
        payload,
        fromAddress,
        toAddress,
        blockNumber,
        apiEtherscanUrl: data.apiEtherscanUrl,
        etherscanUrl: data.etherscanUrl,
        etherscanApiKey: data.etherscanApiKey,
        apiExecutionStrategy,
        apiRateLimit,
        inputMode: data.inputMode,
        txHash: data.txHash,
      })

      // Save form data to localStorage after simulation (success or failure)
      saveFormData({
        rpcUrl: data.rpcUrl,
        payload,
        fromAddress,
        toAddress,
        blockNumber,
        apiEtherscanUrl: data.apiEtherscanUrl,
        etherscanUrl: data.etherscanUrl,
        etherscanApiKey: data.etherscanApiKey,
        inputMode: data.inputMode,
        txHash: data.txHash,
      })
    },
    [fetchedTxData, simulate, saveFormData, apiExecutionStrategy, apiRateLimit]
  )

  /**
   * Handle share action
   */
  const onShare = useCallback(async () => {
    const values = getValues()
    await share({
      payload: values.payload || '',
      fromAddress: values.fromAddress || '',
      toAddress: values.toAddress || '',
      blockNumber: values.blockNumber,
      apiEtherscanUrl: values.apiEtherscanUrl,
      etherscanUrl: values.etherscanUrl,
      etherscanApiKey: values.etherscanApiKey,
      result: simulationResult || undefined,
      inputMode: values.inputMode,
      txHash: values.txHash,
    })

    // Track share event
    trackShare()
  }, [getValues, share, simulationResult])

  /**
   * Handle copy to clipboard action
   */
  const onCopy = useCallback(async () => {
    const values = getValues()
    await copyToClipboard({
      rpcUrl: values.rpcUrl || '',
      payload: values.payload || '',
      fromAddress: values.fromAddress || '',
      toAddress: values.toAddress || '',
      blockNumber: values.blockNumber,
      apiEtherscanUrl: values.apiEtherscanUrl,
      etherscanUrl: values.etherscanUrl,
      etherscanApiKey: values.etherscanApiKey,
      inputMode: values.inputMode,
      txHash: values.txHash,
    })

    // Track copy action
    trackFormAction('copy')
  }, [getValues, copyToClipboard])

  /**
   * Handle paste from clipboard action
   */
  const onPaste = useCallback(async () => {
    await pasteFromClipboard()

    // Track paste action
    trackFormAction('paste')
  }, [pasteFromClipboard])

  /**
   * Handle restore last simulation action
   */
  const onRestore = useCallback(() => {
    const success = restoreFormData()
    if (success) {
      toast.success('Form Restored', {
        description: 'Last simulation data has been restored',
      })
    } else {
      toast.error('Restore Failed', {
        description: 'No saved simulation data found',
      })
    }
  }, [restoreFormData])

  return {
    onSimulate,
    onShare,
    onCopy,
    onPaste,
    onRestore,
  }
}
