import { useState, useEffect } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Share2, Copy, ClipboardPaste } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Toaster } from '@/components/ui/sonner'
import { SimulationService } from '@/lib/simulation-service'
import type { SimulationResult } from '@/lib/types'
import { TraceVisualizer } from '@/components/TraceVisualizer'
import { PrivateBinShareClient } from '@/lib/privatebin-client'
import { ShareModal } from '@/components/ShareModal'
import { ThemeToggle } from '@/components/theme-toggle'

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
  const [isSimulating, setIsSimulating] = useState(false)
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [privateBinUrl, setPrivateBinUrl] = useState('')
  const [isSharing, setIsSharing] = useState(false)

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

  // Load data from URL parameter on mount
  useEffect(() => {
    const loadFromPrivateBin = async () => {
      const privatebinClient = new PrivateBinShareClient()
      const shareUrl = privatebinClient.getShareUrlFromParams()

      if (shareUrl) {
        try {
          toast.info('Loading shared transaction data...')
          const data = await privatebinClient.fetchPaste(shareUrl)

          // Populate form fields (rpcUrl is not shared for security reasons)
          if (data.payload) setValue('payload', data.payload)
          if (data.fromAddress) setValue('fromAddress', data.fromAddress)
          if (data.toAddress) setValue('toAddress', data.toAddress)

          // Restore simulation result if available
          if (data.simulationResult) {
            const restoredResult: SimulationResult = {
              success: data.simulationResult.success,
              trace: data.simulationResult.trace,
              parsedTrace: data.simulationResult.parsedTrace,
              contractNames: data.simulationResult.contractNames
                ? new Map(Object.entries(data.simulationResult.contractNames))
                : undefined,
              chainId: data.simulationResult.chainId,
              etherscanUrl: data.simulationResult.etherscanUrl,
              error: data.simulationResult.error,
              errorDetails: data.simulationResult.errorDetails,
            }
            setResult(restoredResult)

            const resultMsg = restoredResult.success
              ? 'Transaction data and simulation results loaded!'
              : 'Transaction data loaded (simulation failed)'

            toast.success(resultMsg)
          } else {
            toast.success('Transaction data loaded successfully')
          }
        } catch (error) {
          console.error('Failed to load from PrivateBin:', error)
          toast.error('Failed to load shared data', {
            description: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }
    }

    loadFromPrivateBin()
  }, [setValue])

  const onSimulate: SubmitHandler<EVMTracingFormData> = async (data) => {
    console.log('Simulating with data:', data)
    setIsSimulating(true)
    setResult(null)

    try {
      const simulationService = new SimulationService()
      const simulationResult = await simulationService.simulate({
        rpcUrl: data.rpcUrl,
        payload: data.payload,
        fromAddress: data.fromAddress,
        toAddress: data.toAddress,
        blockNumber: data.blockNumber,
        apiEtherscanUrl: data.apiEtherscanUrl,
        etherscanUrl: data.etherscanUrl,
        etherscanApiKey: data.etherscanApiKey,
      })

      setResult(simulationResult)

      // Show toast notification based on result
      if (simulationResult.success) {
        toast.success('Simulation Successful', {
          description: 'Transaction simulation completed successfully',
        })
      } else {
        toast.error('Simulation Failed', {
          description: simulationResult.error || 'An unknown error occurred',
        })
      }
    } catch (error) {
      console.error('Simulation error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      toast.error('Simulation Failed', {
        description: errorMessage,
      })
      setResult({
        success: false,
        error: errorMessage,
      })
    } finally {
      setIsSimulating(false)
    }
  }

  const onShare = async () => {
    const values = getValues()

    // Validate required fields for sharing
    if (!values.payload || !values.fromAddress || !values.toAddress) {
      toast.error('Missing required fields', {
        description: 'Please fill in payload, from address, and to address before sharing',
      })
      return
    }

    setIsSharing(true)

    try {
      const privatebinClient = new PrivateBinShareClient()

      // Prepare simulation result data (if available)
      let simulationResultData
      if (result) {
        simulationResultData = {
          success: result.success,
          trace: result.trace,
          parsedTrace: result.parsedTrace,
          contractNames: result.contractNames
            ? Object.fromEntries(result.contractNames)
            : undefined,
          chainId: result.chainId,
          etherscanUrl: result.etherscanUrl,
          error: result.error,
          errorDetails: result.errorDetails,
        }
      }

      const privatebinResponse = await privatebinClient.createPaste({
        payload: values.payload,
        fromAddress: values.fromAddress,
        toAddress: values.toAddress,
        simulationResult: simulationResultData,
        // Note: rpcUrl is intentionally excluded for security (may contain API keys)
      })

      // Generate both URLs
      const url = privatebinClient.generateShareableUrl(privatebinResponse.url)
      const pbUrl = privatebinClient.getPrivateBinUrl(privatebinResponse.url)

      setShareUrl(url)
      setPrivateBinUrl(pbUrl)
      setShareModalOpen(true)

      const description = result
        ? 'Link includes transaction data and simulation results'
        : 'Link includes transaction data (simulate first to include results)'

      toast.success('Share link created!', {
        description,
      })
    } catch (error) {
      console.error('Failed to create share link:', error)
      toast.error('Failed to create share link', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsSharing(false)
    }
  }

  const onCopyToClipboard = async () => {
    const values = getValues()

    // Copy all form data to clipboard as JSON
    const formData = {
      rpcUrl: values.rpcUrl || '',
      fromAddress: values.fromAddress || '',
      toAddress: values.toAddress || '',
      payload: values.payload || '',
      blockNumber: values.blockNumber || '',
      apiEtherscanUrl: values.apiEtherscanUrl || '',
      etherscanUrl: values.etherscanUrl || '',
      etherscanApiKey: values.etherscanApiKey || '',
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(formData, null, 2))
      toast.success('Copied to clipboard!', {
        description: 'Form data has been copied',
      })
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      toast.error('Failed to copy', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const onPasteFromClipboard = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText()
      const formData = JSON.parse(clipboardText) as Partial<EVMTracingFormData>

      // Set each field if it exists in the clipboard data
      if (formData.rpcUrl !== undefined) setValue('rpcUrl', formData.rpcUrl)
      if (formData.fromAddress !== undefined) setValue('fromAddress', formData.fromAddress)
      if (formData.toAddress !== undefined) setValue('toAddress', formData.toAddress)
      if (formData.payload !== undefined) setValue('payload', formData.payload)
      if (formData.blockNumber !== undefined) setValue('blockNumber', formData.blockNumber)
      if (formData.apiEtherscanUrl !== undefined)
        setValue('apiEtherscanUrl', formData.apiEtherscanUrl)
      if (formData.etherscanUrl !== undefined) setValue('etherscanUrl', formData.etherscanUrl)
      if (formData.etherscanApiKey !== undefined)
        setValue('etherscanApiKey', formData.etherscanApiKey)

      toast.success('Pasted from clipboard!', {
        description: 'Form data has been restored',
      })
    } catch (error) {
      console.error('Failed to paste from clipboard:', error)
      toast.error('Failed to paste', {
        description:
          error instanceof Error ? error.message : 'Invalid clipboard data or permission denied',
      })
    }
  }

  return (
    <>
      <Toaster />
      <ThemeToggle />
      <ShareModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        shareUrl={shareUrl}
        privateBinUrl={privateBinUrl}
      />
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-full lg:max-w-7xl xl:max-w-screen-2xl mx-auto space-y-8 px-2 md:px-0">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold">Flashpoint Studio</h1>
            <p className="text-muted-foreground">Debug and trace EVM transactions</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Transaction Configuration</CardTitle>
              <CardDescription>Enter the details for your EVM transaction trace</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSimulate)} className="space-y-6">
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

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={onCopyToClipboard}
                    title="Copy form data to clipboard"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={onPasteFromClipboard}
                    title="Paste form data from clipboard"
                  >
                    <ClipboardPaste className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={onShare}
                    disabled={isSharing}
                    className="flex-1"
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    {isSharing ? 'Creating link...' : 'Share'}
                  </Button>
                  <Button type="submit" className="flex-1" size="lg" disabled={isSimulating}>
                    {isSimulating ? 'Simulating...' : 'Simulate'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

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
        </div>
      </div>
    </>
  )
}

export default App
