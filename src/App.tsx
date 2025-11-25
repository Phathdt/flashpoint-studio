import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Share2, Copy, ClipboardPaste, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Toaster } from '@/components/ui/sonner'
import { TraceVisualizer } from '@/components/TraceVisualizer'
import { ShareModal } from '@/components/ShareModal'
import { Settings } from '@/components/Settings'
import { SimulationProgress } from '@/components/SimulationProgress'
import { SupportBanner } from '@/components/SupportBanner'
import {
  useSimulation,
  useShareTransaction,
  useLoadSharedTransaction,
  useClipboardForm,
  useContainerSize,
  useApiExecutionStrategy,
  useApiRateLimit,
  useFormPersistence,
  useTransactionAutoFetch,
  useAppFormHandlers,
  useInputModeManager,
  populateFormFields,
} from '@/hooks'
import { trackSimulation } from '@/lib/analytics'
import { TransactionFetcher } from '@/lib/transaction-fetcher'
import { InputMode } from '@/lib/constants'
import { evmTracingSchema, type EVMTracingFormData } from '@/lib/schemas'

function App() {
  // Modal state
  const [shareModalOpen, setShareModalOpen] = useState(false)

  // Form setup
  const form = useForm<EVMTracingFormData>({
    resolver: zodResolver(evmTracingSchema),
    defaultValues: {
      inputMode: InputMode.MANUAL,
      rpcUrl: '',
      payload: '',
      fromAddress: '',
      toAddress: '',
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    getValues,
    watch,
  } = form

  // Watch form values for reactive updates
  const watchedRpcUrl = watch('rpcUrl')
  const watchedTxHash = watch('txHash')
  const watchedInputMode = watch('inputMode')

  // Custom hooks for business logic
  const {
    simulate,
    result: simulationResult,
    isSimulating,
    progress,
  } = useSimulation({
    onSuccess: (result) => {
      // Track simulation event
      trackSimulation(result.success, result.chainId)
    },
  })

  const { share, isSharing, shareUrl, privateBinUrl } = useShareTransaction({
    onSuccess: () => setShareModalOpen(true),
  })

  const { simulationResult: loadedSimulationResult } = useLoadSharedTransaction({
    onSuccess: (data) => {
      // Set input mode
      const mode = (data.inputMode as InputMode) || InputMode.MANUAL
      setValue('inputMode', mode)

      // Populate form fields using utility function
      populateFormFields(setValue, data, mode)
    },
  })

  const { copyToClipboard, pasteFromClipboard } = useClipboardForm({
    onPasteSuccess: (data) => {
      // Set input mode
      const mode = (data.inputMode as InputMode) || InputMode.MANUAL
      setValue('inputMode', mode)

      // Populate form fields using utility function
      populateFormFields(setValue, data, mode)
    },
  })

  const { setContainerSize, containerWidthClass } = useContainerSize()

  const { strategy: apiExecutionStrategy } = useApiExecutionStrategy()
  const { rateLimit: apiRateLimit } = useApiRateLimit()

  const { saveFormData, restoreFormData, hasStoredData } = useFormPersistence(setValue)

  // Transaction fetching hook for txHash mode (must be declared early)
  const {
    data: fetchedTxData,
    isFetching,
    error: fetchError,
    reset: resetFetch,
  } = useTransactionAutoFetch({
    enabled: watchedInputMode === InputMode.TX_HASH,
    rpcUrl: watchedRpcUrl || '',
    txHash: watchedTxHash || '',
    debounceMs: 500,
    onSuccess: (data) => {
      // Auto-populate form fields
      const formatted = TransactionFetcher.formatTransactionData(data)
      populateFormFields(setValue, formatted, InputMode.TX_HASH)
    },
    onError: (error) => {
      console.error('Failed to fetch transaction:', error)
    },
  })

  // Input mode management
  const { inputMode } = useInputModeManager(watchedInputMode, setValue, resetFetch)

  // Use loaded simulation result if available, otherwise use current simulation result
  const result = simulationResult || loadedSimulationResult

  // Form action handlers (extracted to custom hook)
  const { onSimulate, onShare, onCopy, onPaste, onRestore } = useAppFormHandlers({
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
  })

  return (
    <>
      <Toaster />
      <Settings onSizeChange={setContainerSize} />
      <ShareModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        shareUrl={shareUrl}
        privateBinUrl={privateBinUrl}
      />
      <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6 lg:p-8">
        <div className={`mx-auto space-y-4 sm:space-y-6 md:space-y-8 ${containerWidthClass}`}>
          <div className="text-center space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold">Flashpoint Studio</h1>
            <p className="text-muted-foreground">Debug and trace EVM transactions</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Transaction Configuration</CardTitle>
              <CardDescription>Enter the details for your EVM transaction trace</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSimulate)} className="space-y-4 md:space-y-6">
                <Tabs
                  value={inputMode}
                  onValueChange={(value) => {
                    setValue('inputMode', value as InputMode)
                  }}
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value={InputMode.MANUAL}>Manual Input</TabsTrigger>
                    <TabsTrigger value={InputMode.TX_HASH}>Transaction Hash</TabsTrigger>
                  </TabsList>

                  {/* Manual Input Tab */}
                  <TabsContent value={InputMode.MANUAL} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="rpcUrl">RPC URL</Label>
                      <Input
                        id="rpcUrl"
                        placeholder="https://eth-mainnet.g.alchemy.com/v2/..."
                        {...register('rpcUrl')}
                      />
                      {errors.rpcUrl && (
                        <p className="text-sm text-destructive">{errors.rpcUrl.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fromAddress">From Address</Label>
                      <Input id="fromAddress" placeholder="0x..." {...register('fromAddress')} />
                      {errors.fromAddress && (
                        <p className="text-sm text-destructive">{errors.fromAddress.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="toAddress">To Address</Label>
                      <Input id="toAddress" placeholder="0x..." {...register('toAddress')} />
                      {errors.toAddress && (
                        <p className="text-sm text-destructive">{errors.toAddress.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="payload">Payload</Label>
                      <Input id="payload" placeholder="0x..." {...register('payload')} />
                      {errors.payload && (
                        <p className="text-sm text-destructive">{errors.payload.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="blockNumber">Block Number (Optional)</Label>
                      <Input
                        id="blockNumber"
                        placeholder="latest (or specify: 5000000 or 0x4C4B40)"
                        {...register('blockNumber')}
                      />
                      {errors.blockNumber && (
                        <p className="text-sm text-destructive">{errors.blockNumber.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="apiEtherscanUrl">API Etherscan URL (Optional)</Label>
                      <Input
                        id="apiEtherscanUrl"
                        placeholder="https://api.etherscan.io/v2/api (default)"
                        {...register('apiEtherscanUrl')}
                      />
                      {errors.apiEtherscanUrl && (
                        <p className="text-sm text-destructive">{errors.apiEtherscanUrl.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="etherscanUrl">Etherscan URL (Optional)</Label>
                      <Input
                        id="etherscanUrl"
                        placeholder="https://etherscan.io (auto-detected if empty)"
                        {...register('etherscanUrl')}
                      />
                      {errors.etherscanUrl && (
                        <p className="text-sm text-destructive">{errors.etherscanUrl.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="etherscanApiKey">Etherscan API Key(s) (Optional)</Label>
                      <Input
                        id="etherscanApiKey"
                        placeholder="key1,key2,key3 (comma-separated for rotation)"
                        {...register('etherscanApiKey')}
                      />
                      <p className="text-xs text-muted-foreground">
                        Multiple keys can be comma-separated for rotation to avoid rate limits
                      </p>
                      {errors.etherscanApiKey && (
                        <p className="text-sm text-destructive">{errors.etherscanApiKey.message}</p>
                      )}
                    </div>
                  </TabsContent>

                  {/* Transaction Hash Tab */}
                  <TabsContent value={InputMode.TX_HASH} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="rpcUrl-hash">RPC URL</Label>
                      <Input
                        id="rpcUrl-hash"
                        placeholder="https://eth-mainnet.g.alchemy.com/v2/..."
                        {...register('rpcUrl')}
                      />
                      {errors.rpcUrl && (
                        <p className="text-sm text-destructive">{errors.rpcUrl.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="txHash">Transaction Hash</Label>
                      <Input
                        id="txHash"
                        placeholder="0x..."
                        {...register('txHash')}
                        disabled={isFetching}
                      />
                      {errors.txHash && (
                        <p className="text-sm text-destructive">{errors.txHash.message}</p>
                      )}
                      {isFetching && (
                        <p className="text-sm text-muted-foreground">
                          Fetching transaction details...
                        </p>
                      )}
                      {fetchError && <p className="text-sm text-destructive">{fetchError}</p>}
                    </div>

                    {/* Display fetched transaction details */}
                    {fetchedTxData && (
                      <Card className="bg-muted/50">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Fetched Transaction Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <Label className="text-xs text-muted-foreground">From Address</Label>
                              <div className="font-mono text-xs break-all">
                                {fetchedTxData.from}
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">To Address</Label>
                              <div className="font-mono text-xs break-all">
                                {fetchedTxData.to || '0x0000000000000000000000000000000000000000'}
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">
                                Transaction Block
                              </Label>
                              <div className="font-mono text-xs">{fetchedTxData.blockNumber}</div>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">
                                Simulation Block
                              </Label>
                              <div className="font-mono text-xs">
                                {TransactionFetcher.getSimulationBlockNumber(
                                  fetchedTxData.blockNumber
                                )}
                              </div>
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs text-muted-foreground">Data Size</Label>
                              <div className="font-mono text-xs">
                                {fetchedTxData.data.length} chars
                              </div>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Payload Preview</Label>
                            <div className="font-mono text-xs break-all bg-background p-2 rounded">
                              {fetchedTxData.data.slice(0, 66)}...
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="apiEtherscanUrl-hash">API Etherscan URL (Optional)</Label>
                      <Input
                        id="apiEtherscanUrl-hash"
                        placeholder="https://api.etherscan.io/v2/api (default)"
                        {...register('apiEtherscanUrl')}
                      />
                      {errors.apiEtherscanUrl && (
                        <p className="text-sm text-destructive">{errors.apiEtherscanUrl.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="etherscanUrl-hash">Etherscan URL (Optional)</Label>
                      <Input
                        id="etherscanUrl-hash"
                        placeholder="https://etherscan.io (auto-detected if empty)"
                        {...register('etherscanUrl')}
                      />
                      {errors.etherscanUrl && (
                        <p className="text-sm text-destructive">{errors.etherscanUrl.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="etherscanApiKey-hash">Etherscan API Key(s) (Optional)</Label>
                      <Input
                        id="etherscanApiKey-hash"
                        placeholder="key1,key2,key3 (comma-separated for rotation)"
                        {...register('etherscanApiKey')}
                      />
                      <p className="text-xs text-muted-foreground">
                        Multiple keys can be comma-separated for rotation to avoid rate limits
                      </p>
                      {errors.etherscanApiKey && (
                        <p className="text-sm text-destructive">{errors.etherscanApiKey.message}</p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <div className="flex gap-2 sm:gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={onCopy}
                      title="Copy form data to clipboard"
                      className="flex-1 sm:flex-none"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={onPaste}
                      title="Paste form data from clipboard"
                      className="flex-1 sm:flex-none"
                    >
                      <ClipboardPaste className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={onRestore}
                      disabled={!hasStoredData}
                      title="Restore last simulation"
                      className="flex-1 sm:flex-none"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={onShare}
                    disabled={isSharing}
                    className="w-full sm:flex-1"
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    {isSharing ? 'Creating link...' : 'Share'}
                  </Button>
                  <Button
                    type="submit"
                    className="w-full sm:flex-1"
                    size="lg"
                    disabled={
                      isSimulating ||
                      (inputMode === InputMode.TX_HASH && (!fetchedTxData || isFetching))
                    }
                  >
                    {isSimulating ? 'Simulating...' : 'Simulate'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Progress indicator during simulation */}
          {isSimulating && progress && <SimulationProgress progress={progress} />}

          {result && (
            <Card>
              <CardHeader>
                <CardTitle>Simulation Result</CardTitle>
                <CardDescription>
                  {result.success ? 'Transaction simulation completed' : 'Simulation failed'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {result.success ? (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-green-50 p-4 dark:bg-green-950">
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        ✓ Simulation successful!
                      </p>
                    </div>

                    {result.parsedTrace ? (
                      <TraceVisualizer
                        frame={result.parsedTrace.frame}
                        stats={result.parsedTrace.stats}
                        contractNames={result.contractNames}
                        chainId={result.chainId}
                        etherscanUrl={result.etherscanUrl}
                        allTransfers={result.allTransfers}
                        tokenMetadata={result.tokenMetadata}
                      />
                    ) : result.trace ? (
                      <div className="space-y-2">
                        <h3 className="font-semibold">Trace Details (Raw)</h3>
                        <pre className="overflow-auto rounded-lg bg-muted p-4 text-xs">
                          {JSON.stringify(result.trace, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-950">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          ⚠ {result.error || 'Trace data not available'}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-red-50 p-4 dark:bg-red-950">
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">
                        ✗ Simulation failed
                      </p>
                      <p className="mt-2 text-sm text-red-700 dark:text-red-300">{result.error}</p>
                    </div>

                    {result.errorDetails && (
                      <div className="space-y-2">
                        <h3 className="font-semibold">Error Details</h3>
                        <div className="rounded-lg bg-muted p-4">
                          <dl className="space-y-2 text-sm">
                            <div>
                              <dt className="font-medium text-slate-600 dark:text-slate-400">
                                Type:
                              </dt>
                              <dd className="text-slate-900 dark:text-slate-100">
                                {result.errorDetails.type}
                              </dd>
                            </div>
                            {result.errorDetails.reason && (
                              <div>
                                <dt className="font-medium text-slate-600 dark:text-slate-400">
                                  Reason:
                                </dt>
                                <dd className="text-slate-900 dark:text-slate-100">
                                  {result.errorDetails.reason}
                                </dd>
                              </div>
                            )}
                          </dl>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Support Banner */}
          <SupportBanner />
        </div>
      </div>
    </>
  )
}

export default App
