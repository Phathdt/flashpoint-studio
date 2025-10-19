import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const evmTracingSchema = z.object({
  rpcUrl: z.string().url('Must be a valid URL'),
  payload: z.string().min(1, 'Payload is required'),
  fromAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid Ethereum address'),
  toAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid Ethereum address'),
  etherscanUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  etherscanApiKey: z.string().optional(),
})

type EVMTracingFormData = z.infer<typeof evmTracingSchema>

function App() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EVMTracingFormData>({
    resolver: zodResolver(evmTracingSchema),
  })

  const onSimulate = async (data: EVMTracingFormData) => {
    console.log('Simulating with data:', data)
    // TODO: Implement RPC call
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">EVM Tracing Debugger</h1>
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
                <Input
                  id="payload"
                  placeholder="0x..."
                  {...register('payload')}
                />
                {errors.payload && (
                  <p className="text-sm text-destructive">{errors.payload.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fromAddress">From Address</Label>
                <Input
                  id="fromAddress"
                  placeholder="0x..."
                  {...register('fromAddress')}
                />
                {errors.fromAddress && (
                  <p className="text-sm text-destructive">{errors.fromAddress.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="toAddress">To Address</Label>
                <Input
                  id="toAddress"
                  placeholder="0x..."
                  {...register('toAddress')}
                />
                {errors.toAddress && (
                  <p className="text-sm text-destructive">{errors.toAddress.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="etherscanUrl">Etherscan URL (Optional)</Label>
                <Input
                  id="etherscanUrl"
                  placeholder="https://api.etherscan.io"
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
                  type="password"
                  placeholder="Your Etherscan API key"
                  {...register('etherscanApiKey')}
                />
                {errors.etherscanApiKey && (
                  <p className="text-sm text-destructive">{errors.etherscanApiKey.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" size="lg">
                Simulate
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default App
