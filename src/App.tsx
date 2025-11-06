import { useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Share2, Copy, ClipboardPaste, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
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
  useFormPersistence,
} from '@/hooks'
import { trackSimulation, trackShare, trackFormAction } from '@/lib/analytics'

const evmTracingSchema = z.object({
  rpcUrl: z.string().url({ message: 'Must be a valid URL' }),
  payload: z.string().min(1, 'Payload is required'),
  fromAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid Ethereum address'),
  toAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid Ethereum address'),
  blockNumber: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val === '') return true
        // Allow decimal numbers or hex numbers (0x prefix)
        return /^\d+$/.test(val) || /^0x[0-9a-fA-F]+$/.test(val)
      },
      {
        message: 'Must be a valid block number (decimal or hex with 0x prefix)',
      }
    ),
  apiEtherscanUrl: z
    .string()
    .optional()
    .refine(
      (val) =>
        !val ||
        val === '' ||
        z.string().url({ message: 'Must be a valid URL' }).safeParse(val).success,
      {
        message: 'Must be a valid URL',
      }
    ),
  etherscanUrl: z
    .string()
    .optional()
    .refine(
      (val) =>
        !val ||
        val === '' ||
        z.string().url({ message: 'Must be a valid URL' }).safeParse(val).success,
      {
        message: 'Must be a valid URL',
      }
    ),
  etherscanApiKey: z.string().optional(),
})

type EVMTracingFormData = z.infer<typeof evmTracingSchema>

function App() {
  // Modal state
  const [shareModalOpen, setShareModalOpen] = useState(false)

  // Form setup
  const form = useForm<EVMTracingFormData>({
    resolver: zodResolver(evmTracingSchema),
    defaultValues: {},
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    getValues,
  } = form

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
      // Auto-populate form with loaded data
      if (data.payload) setValue('payload', data.payload)
      if (data.fromAddress) setValue('fromAddress', data.fromAddress)
      if (data.toAddress) setValue('toAddress', data.toAddress)
      if (data.blockNumber) setValue('blockNumber', data.blockNumber)
      if (data.apiEtherscanUrl) setValue('apiEtherscanUrl', data.apiEtherscanUrl)
      if (data.etherscanUrl) setValue('etherscanUrl', data.etherscanUrl)
      // Note: etherscanApiKey is not loaded from shared links (not shared for security)
    },
  })

  const { copyToClipboard, pasteFromClipboard } = useClipboardForm({
    onPasteSuccess: (data) => {
      // Auto-populate form with pasted data
      if (data.rpcUrl) setValue('rpcUrl', data.rpcUrl)
      if (data.fromAddress) setValue('fromAddress', data.fromAddress)
      if (data.toAddress) setValue('toAddress', data.toAddress)
      if (data.payload) setValue('payload', data.payload)
      if (data.blockNumber) setValue('blockNumber', data.blockNumber)
      if (data.apiEtherscanUrl) setValue('apiEtherscanUrl', data.apiEtherscanUrl)
      if (data.etherscanUrl) setValue('etherscanUrl', data.etherscanUrl)
      if (data.etherscanApiKey) setValue('etherscanApiKey', data.etherscanApiKey)
    },
  })

  const { setContainerSize, containerWidthClass } = useContainerSize()

  const { strategy: apiExecutionStrategy } = useApiExecutionStrategy()

  const { saveFormData, restoreFormData, hasStoredData } = useFormPersistence(setValue)

  // Use loaded simulation result if available, otherwise use current simulation result
  const result = simulationResult || loadedSimulationResult

  // Form handlers
  const onSimulate: SubmitHandler<EVMTracingFormData> = async (data) => {
    await simulate({
      rpcUrl: data.rpcUrl,
      payload: data.payload,
      fromAddress: data.fromAddress,
      toAddress: data.toAddress,
      blockNumber: data.blockNumber,
      apiEtherscanUrl: data.apiEtherscanUrl,
      etherscanUrl: data.etherscanUrl,
      etherscanApiKey: data.etherscanApiKey,
      apiExecutionStrategy,
    })

    // Save form data to localStorage after simulation (success or failure)
    saveFormData({
      rpcUrl: data.rpcUrl,
      payload: data.payload,
      fromAddress: data.fromAddress,
      toAddress: data.toAddress,
      blockNumber: data.blockNumber,
      apiEtherscanUrl: data.apiEtherscanUrl,
      etherscanUrl: data.etherscanUrl,
      etherscanApiKey: data.etherscanApiKey,
    })
  }

  const onShare = async () => {
    const values = getValues()
    await share({
      payload: values.payload,
      fromAddress: values.fromAddress,
      toAddress: values.toAddress,
      blockNumber: values.blockNumber,
      apiEtherscanUrl: values.apiEtherscanUrl,
      etherscanUrl: values.etherscanUrl,
      etherscanApiKey: values.etherscanApiKey,
      result: simulationResult || undefined,
    })

    // Track share event
    trackShare()
  }

  const onCopyToClipboard = async () => {
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
    })

    // Track copy action
    trackFormAction('copy')
  }

  const onPasteFromClipboard = async () => {
    await pasteFromClipboard()

    // Track paste action
    trackFormAction('paste')
  }

  const onRestoreLastSimulation = () => {
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
  }

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
                  <Label htmlFor="etherscanApiKey">Etherscan API Key (Optional)</Label>
                  <Input
                    id="etherscanApiKey"
                    placeholder="Your Etherscan API key"
                    {...register('etherscanApiKey')}
                  />
                  {errors.etherscanApiKey && (
                    <p className="text-sm text-destructive">{errors.etherscanApiKey.message}</p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <div className="flex gap-2 sm:gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={onCopyToClipboard}
                      title="Copy form data to clipboard"
                      className="flex-1 sm:flex-none"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={onPasteFromClipboard}
                      title="Paste form data from clipboard"
                      className="flex-1 sm:flex-none"
                    >
                      <ClipboardPaste className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={onRestoreLastSimulation}
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
                    disabled={isSimulating}
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
