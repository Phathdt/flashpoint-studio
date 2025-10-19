import { useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Toaster } from '@/components/ui/sonner'
import { SimulationService } from '@/lib/simulation-service'
import type { SimulationResult } from '@/lib/types'
import { TraceVisualizer } from '@/components/TraceVisualizer'

const evmTracingSchema = z.object({
  rpcUrl: z.string().url({ message: 'Must be a valid URL' }),
  payload: z.string().min(1, 'Payload is required'),
  fromAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid Ethereum address'),
  toAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid Ethereum address'),
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

  const form = useForm<EVMTracingFormData>({
    resolver: zodResolver(evmTracingSchema),
    defaultValues: {
      apiEtherscanUrl: 'https://api.etherscan.io/v2/api',
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form

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

  return (
    <>
      <Toaster />
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto space-y-8">
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
                  <Label htmlFor="payload">Payload</Label>
                  <Input id="payload" placeholder="0x..." {...register('payload')} />
                  {errors.payload && (
                    <p className="text-sm text-destructive">{errors.payload.message}</p>
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

                <Button type="submit" className="w-full" size="lg" disabled={isSimulating}>
                  {isSimulating ? 'Simulating...' : 'Simulate'}
                </Button>
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
                        <pre className="overflow-auto rounded-lg bg-slate-50 p-4 text-xs dark:bg-slate-900">
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
                        <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-900">
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
