import type { ParsedCallFrame, TraceStats } from '@/lib/trace-parser'
import { getAddressUrl } from '@/lib/etherscan-utils'

interface TraceVisualizerProps {
  frame: ParsedCallFrame
  stats: TraceStats
  contractNames?: Map<string, string>
  chainId?: number
  etherscanUrl?: string
}

export function TraceVisualizer({
  frame,
  stats,
  contractNames = new Map(),
  chainId = 1,
  etherscanUrl,
}: TraceVisualizerProps) {
  const formatGas = (gas: bigint): string => {
    return gas.toLocaleString('en-US')
  }

  const formatAddress = (address: string): React.ReactNode => {
    if (!address) {
      address = '0x0000000000000000000000000000000000000000'
    }

    // Use custom etherscanUrl if provided, otherwise use chainId-based URL
    const addressUrl = etherscanUrl
      ? `${etherscanUrl}/address/${address}`
      : getAddressUrl(address, chainId)
    const contractName = contractNames.get(address.toLowerCase())

    if (contractName) {
      return (
        <>
          <a
            href={addressUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-purple-600 underline hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
          >
            {address}
          </a>{' '}
          <span className="text-blue-500 dark:text-blue-400">({contractName})</span>
        </>
      )
    }

    return (
      <a
        href={addressUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-purple-600 underline hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
      >
        {address}
      </a>
    )
  }

  const formatValue = (value: unknown): React.ReactNode => {
    if (typeof value === 'bigint') {
      return (
        <span className="font-mono text-orange-600 dark:text-orange-300">{value.toString()}</span>
      )
    } else if (typeof value === 'boolean') {
      return (
        <span
          className={
            value ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }
        >
          {value ? 'true' : 'false'}
        </span>
      )
    } else if (typeof value === 'string') {
      // Check if it's an Ethereum address
      if (/^0x[a-fA-F0-9]{40}$/.test(value)) {
        return formatAddress(value)
      } else if (value.length > 66) {
        return (
          <span className="font-mono text-slate-800 dark:text-slate-100">
            {value.slice(0, 66)}...{' '}
            <span className="text-slate-600 dark:text-slate-400">({value.length} chars)</span>
          </span>
        )
      } else if (/^0x[a-fA-F0-9]+$/.test(value)) {
        // It's a hex string
        return <span className="font-mono text-slate-800 dark:text-slate-100">{value}</span>
      } else {
        return <span className="font-mono text-slate-800 dark:text-slate-100">{value}</span>
      }
    } else if (Array.isArray(value)) {
      return (
        <span className="font-mono text-slate-800 dark:text-slate-100">
          {JSON.stringify(value, (_, v) => (typeof v === 'bigint' ? v.toString() : v))}
        </span>
      )
    } else if (typeof value === 'object' && value !== null) {
      return (
        <span className="font-mono text-slate-800 dark:text-slate-100">
          {JSON.stringify(value, (_, v) => (typeof v === 'bigint' ? v.toString() : v))}
        </span>
      )
    } else {
      return <span className="font-mono text-slate-800 dark:text-slate-100">{String(value)}</span>
    }
  }

  const getCallTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      CALL: 'text-cyan-600 dark:text-cyan-400',
      DELEGATECALL: 'text-fuchsia-600 dark:text-fuchsia-400',
      STATICCALL: 'text-yellow-600 dark:text-yellow-400',
      CREATE: 'text-green-600 dark:text-green-400',
      CREATE2: 'text-green-600 dark:text-green-400',
      SELFDESTRUCT: 'text-red-600 dark:text-red-400',
    }
    return colors[type] || 'text-slate-600 dark:text-slate-400'
  }

  const renderCallFrame = (
    cf: ParsedCallFrame,
    prefix: string = '',
    isLast: boolean = true,
    isRoot: boolean = true
  ): React.ReactNode => {
    const connector = isRoot ? '' : isLast ? '└─' : '├─'
    const childPrefix = isRoot ? '' : isLast ? '   ' : '│  '

    const valueStr = cf.value > 0n ? ` {value: ${cf.value.toString()} wei}` : ''

    return (
      <div key={`${cf.from}-${cf.to}-${cf.depth}`} className="font-mono text-sm">
        {/* Main call line */}
        <div className="whitespace-nowrap">
          <span className="text-slate-500 dark:text-slate-500 dark:text-slate-400">
            {prefix}
            {connector}
          </span>{' '}
          <span className={`font-bold ${getCallTypeColor(cf.type)}`}>{cf.type}</span>{' '}
          {formatAddress(cf.from)} <span className="text-slate-800 dark:text-slate-100">→</span>{' '}
          {formatAddress(cf.to)}
          {valueStr && <span className="text-slate-800 dark:text-slate-100">{valueStr}</span>}
        </div>

        {/* Function signature */}
        <div className="ml-0 whitespace-nowrap">
          <span className="text-slate-500 dark:text-slate-500 dark:text-slate-400">
            {prefix}
            {childPrefix}├─
          </span>{' '}
          <span className="font-bold text-slate-800 dark:text-slate-200">Function:</span>{' '}
          <span className="text-cyan-600 dark:text-cyan-300">{cf.functionSignature}</span>
        </div>

        {/* Decoded input arguments */}
        {cf.decodedInput && cf.decodedInput.length > 0 && (
          <>
            {cf.decodedInput.map((arg, index) => {
              const paramName = cf.inputParamNames?.[index] || `arg[${index}]`
              const paramType = cf.inputParamTypes?.[index]

              // Check if this is an array of tuples (e.g., tuple[])
              if (
                paramType &&
                paramType.baseType === 'array' &&
                paramType.arrayChildren &&
                paramType.arrayChildren.baseType === 'tuple' &&
                Array.isArray(arg) &&
                paramType.arrayChildren.components
              ) {
                // Render array header
                const arrayHeader = (
                  <div key={`${index}-header`} className="ml-0 whitespace-nowrap">
                    <span className="text-slate-500 dark:text-slate-500 dark:text-slate-400">
                      {prefix}
                      {childPrefix}│
                    </span>{' '}
                    <span className="text-slate-600 dark:text-slate-300">
                      {' '}
                      {paramName}: [{arg.length} items]
                    </span>
                  </div>
                )

                // Render each tuple in the array
                const arrayItems = arg.map((tupleItem, tupleIndex) => {
                  if (Array.isArray(tupleItem)) {
                    return paramType.arrayChildren!.components!.map((component, fieldIndex) => {
                      const fieldName = component.name || `field${fieldIndex}`
                      const fieldValue = tupleItem[fieldIndex]
                      return (
                        <div
                          key={`${index}-${tupleIndex}-${fieldIndex}`}
                          className="ml-0 whitespace-nowrap"
                        >
                          <span className="text-slate-500 dark:text-slate-500 dark:text-slate-400">
                            {prefix}
                            {childPrefix}│
                          </span>{' '}
                          <span className="text-slate-600 dark:text-slate-300">
                            {' '}
                            {paramName}[{tupleIndex}].{fieldName}:
                          </span>{' '}
                          {formatValue(fieldValue)}
                        </div>
                      )
                    })
                  }
                  return null
                })

                return [arrayHeader, ...arrayItems]
              }
              // Check if this is a single tuple/struct
              else if (
                paramType &&
                paramType.baseType === 'tuple' &&
                Array.isArray(arg) &&
                paramType.components
              ) {
                return paramType.components.map((component, fieldIndex) => {
                  const fieldName = component.name || `field${fieldIndex}`
                  const fieldValue = arg[fieldIndex]
                  return (
                    <div key={`${index}-${fieldIndex}`} className="ml-0 whitespace-nowrap">
                      <span className="text-slate-500 dark:text-slate-500 dark:text-slate-400">
                        {prefix}
                        {childPrefix}│
                      </span>{' '}
                      <span className="text-slate-600 dark:text-slate-300">
                        {' '}
                        {paramName}.{fieldName}:
                      </span>{' '}
                      {formatValue(fieldValue)}
                    </div>
                  )
                })
              } else {
                return (
                  <div key={index} className="ml-0 whitespace-nowrap">
                    <span className="text-slate-500 dark:text-slate-500 dark:text-slate-400">
                      {prefix}
                      {childPrefix}│
                    </span>{' '}
                    <span className="text-slate-600 dark:text-slate-300"> {paramName}:</span>{' '}
                    {formatValue(arg)}
                  </div>
                )
              }
            })}
          </>
        )}

        {/* Gas info */}
        <div className="ml-0 whitespace-nowrap">
          <span className="text-slate-500 dark:text-slate-500 dark:text-slate-400">
            {prefix}
            {childPrefix}├─
          </span>{' '}
          <span className="font-bold text-slate-800 dark:text-slate-200">Gas:</span>{' '}
          <span className="text-yellow-600 dark:text-yellow-300">{formatGas(cf.gas)}</span>{' '}
          <span className="text-slate-700 dark:text-slate-200">(Used:</span>{' '}
          <span className="text-yellow-600 dark:text-yellow-300">{formatGas(cf.gasUsed)}</span>
          <span className="text-slate-700 dark:text-slate-200">,</span>{' '}
          <span className="text-orange-600 dark:text-orange-300">
            {cf.gasPercentage.toFixed(1)}%
          </span>
          <span className="text-slate-700 dark:text-slate-200">)</span>
        </div>

        {/* Error display */}
        {(cf.error || cf.revertReason || cf.decodedError) && (
          <>
            {cf.decodedError ? (
              <>
                <div className="ml-0 whitespace-nowrap">
                  <span className="text-slate-500 dark:text-slate-400">
                    {prefix}
                    {childPrefix}├─
                  </span>{' '}
                  <span className="font-bold text-red-600 dark:text-red-400">ERROR:</span>{' '}
                  <span className="text-red-600 dark:text-red-400">
                    {cf.decodedError.signature}
                  </span>
                </div>
                {cf.decodedError.args &&
                  cf.decodedError.args.map((arg, index) => (
                    <div key={index} className="ml-0 whitespace-nowrap">
                      <span className="text-slate-500 dark:text-slate-400">
                        {prefix}
                        {childPrefix}│
                      </span>{' '}
                      <span className="text-slate-600 dark:text-slate-300">
                        {' '}
                        arg{index}: {typeof arg === 'bigint' ? arg.toString() : String(arg)}
                      </span>
                    </div>
                  ))}
                {cf.output && cf.output !== '0x' && (
                  <div className="ml-0 whitespace-nowrap">
                    <span className="text-slate-500 dark:text-slate-400">
                      {prefix}
                      {childPrefix}├─
                    </span>{' '}
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Raw Error Data:
                    </span>{' '}
                    <span className="font-mono text-slate-800 dark:text-slate-100">
                      {cf.output}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="ml-0 whitespace-nowrap">
                  <span className="text-slate-500 dark:text-slate-400">
                    {prefix}
                    {childPrefix}├─
                  </span>{' '}
                  <span className="font-bold text-red-600 dark:text-red-400">ERROR:</span>{' '}
                  <span className="text-red-600 dark:text-red-400">
                    {cf.revertReason || cf.error || 'Unknown error'}
                  </span>
                </div>
                {cf.output && cf.output !== '0x' && cf.output.length >= 10 && (
                  <>
                    <div className="ml-0 whitespace-nowrap">
                      <span className="text-slate-500 dark:text-slate-400">
                        {prefix}
                        {childPrefix}├─
                      </span>{' '}
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        Error Selector:
                      </span>{' '}
                      <span className="font-mono text-slate-800 dark:text-slate-100">
                        {cf.output.slice(0, 10)}
                      </span>
                    </div>
                    {cf.output.length > 10 && (
                      <div className="ml-0 whitespace-nowrap">
                        <span className="text-slate-500 dark:text-slate-400">
                          {prefix}
                          {childPrefix}├─
                        </span>{' '}
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          Full Error Data:
                        </span>{' '}
                        <span className="font-mono text-slate-800 dark:text-slate-100">
                          {cf.output}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* Successful output display */}
        {!cf.error && !cf.revertReason && !cf.decodedError && cf.output && cf.output !== '0x' && (
          <>
            {cf.decodedOutput && cf.decodedOutput.length > 0 ? (
              <>
                <div className="ml-0 whitespace-nowrap">
                  <span className="text-slate-500 dark:text-slate-400">
                    {prefix}
                    {childPrefix}├─
                  </span>{' '}
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Decoded Output:
                  </span>
                </div>
                {cf.decodedOutput.map((value, index) => {
                  const paramName = cf.outputParamNames?.[index] || `[${index}]`
                  const paramType = cf.outputParamTypes?.[index]

                  // Check if this is an array of tuples (e.g., tuple[])
                  if (
                    paramType &&
                    paramType.baseType === 'array' &&
                    paramType.arrayChildren &&
                    paramType.arrayChildren.baseType === 'tuple' &&
                    Array.isArray(value) &&
                    paramType.arrayChildren.components
                  ) {
                    // Render array header
                    const arrayHeader = (
                      <div key={`${index}-header`} className="ml-0 whitespace-nowrap">
                        <span className="text-slate-500 dark:text-slate-400">
                          {prefix}
                          {childPrefix}│
                        </span>{' '}
                        <span className="text-slate-600 dark:text-slate-300">
                          {paramName}: [{value.length} items]
                        </span>
                      </div>
                    )

                    // Render each tuple in the array
                    const arrayItems = value.map((tupleItem, tupleIndex) => {
                      if (Array.isArray(tupleItem)) {
                        return paramType.arrayChildren!.components!.map((component, fieldIndex) => {
                          const fieldName = component.name || `field${fieldIndex}`
                          const fieldValue = tupleItem[fieldIndex]
                          return (
                            <div
                              key={`${index}-${tupleIndex}-${fieldIndex}`}
                              className="ml-0 whitespace-nowrap"
                            >
                              <span className="text-slate-500 dark:text-slate-400">
                                {prefix}
                                {childPrefix}│
                              </span>{' '}
                              <span className="text-slate-600 dark:text-slate-300">
                                {paramName}[{tupleIndex}].{fieldName}:
                              </span>{' '}
                              {formatValue(fieldValue)}
                            </div>
                          )
                        })
                      }
                      return null
                    })

                    return [arrayHeader, ...arrayItems]
                  }
                  // Check if this is a single tuple/struct
                  else if (
                    paramType &&
                    paramType.baseType === 'tuple' &&
                    Array.isArray(value) &&
                    paramType.components
                  ) {
                    return paramType.components.map((component, fieldIndex) => {
                      const fieldName = component.name || `field${fieldIndex}`
                      const fieldValue = value[fieldIndex]
                      return (
                        <div key={`${index}-${fieldIndex}`} className="ml-0 whitespace-nowrap">
                          <span className="text-slate-500 dark:text-slate-400">
                            {prefix}
                            {childPrefix}│
                          </span>{' '}
                          <span className="text-slate-600 dark:text-slate-300">
                            {paramName}.{fieldName}:
                          </span>{' '}
                          {formatValue(fieldValue)}
                        </div>
                      )
                    })
                  } else {
                    return (
                      <div key={index} className="ml-0 whitespace-nowrap">
                        <span className="text-slate-500 dark:text-slate-400">
                          {prefix}
                          {childPrefix}│
                        </span>{' '}
                        <span className="text-slate-600 dark:text-slate-300">{paramName}:</span>{' '}
                        {formatValue(value)}
                      </div>
                    )
                  }
                })}
                {cf.output.length <= 66 && (
                  <div className="ml-0 whitespace-nowrap">
                    <span className="text-slate-500 dark:text-slate-400">
                      {prefix}
                      {childPrefix}├─
                    </span>{' '}
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Raw Output:
                    </span>{' '}
                    <span className="text-green-600 dark:text-green-400">{cf.output}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="ml-0 whitespace-nowrap">
                <span className="text-slate-500 dark:text-slate-400">
                  {prefix}
                  {childPrefix}├─
                </span>{' '}
                <span className="font-bold text-slate-800 dark:text-slate-200">Output:</span>{' '}
                <span className="text-green-600 dark:text-green-400">
                  {cf.output.length <= 66
                    ? cf.output
                    : `${cf.output.slice(0, 66)}... (${cf.output.length} bytes)`}
                </span>
              </div>
            )}
          </>
        )}

        {/* Input selector for debugging */}
        {cf.input && cf.input.length > 10 && !cf.error && !cf.revertReason && !cf.decodedError && (
          <div className="ml-0 whitespace-nowrap">
            <span className="text-slate-500 dark:text-slate-400">
              {prefix}
              {childPrefix}├─
            </span>{' '}
            <span className="font-bold text-slate-800 dark:text-slate-200">Input Selector:</span>{' '}
            <span className="font-mono text-slate-800 dark:text-slate-100">
              {cf.input.slice(0, 10)}
            </span>
          </div>
        )}

        {/* Separator before nested calls */}
        {cf.calls.length > 0 && (
          <div className="ml-0 whitespace-nowrap">
            <span className="text-slate-500 dark:text-slate-400">
              {prefix}
              {childPrefix}│
            </span>
          </div>
        )}

        {/* Nested calls */}
        {cf.calls.map((call, index) => {
          const isLastChild = index === cf.calls.length - 1
          const nestedPrefix = prefix + childPrefix
          return renderCallFrame(call, nestedPrefix, isLastChild, false)
        })}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="border-b-2 border-border pb-2">
        <h3 className="text-center text-xl font-bold">TRANSACTION TRACE</h3>
      </div>

      {/* Trace tree */}
      <div className="overflow-x-auto rounded-lg bg-muted p-4">{renderCallFrame(frame)}</div>

      {/* Summary */}
      <div className="space-y-2 border-t-2 border-border pt-4">
        <h3 className="text-center text-xl font-bold">SUMMARY</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="font-bold">Total Gas Used:</span> {formatGas(stats.totalGasUsed)}
          </div>
          <div>
            <span className="font-bold">Call Frames:</span> {stats.totalCalls}
          </div>
          <div>
            <span className="font-bold">Max Depth:</span> {stats.maxDepth}
          </div>
          <div>
            <span className="font-bold">Status:</span>{' '}
            <span
              className={
                stats.hasError
                  ? 'font-bold text-red-600 dark:text-red-400'
                  : 'font-bold text-green-600 dark:text-green-400'
              }
            >
              {stats.hasError ? 'FAILED' : 'SUCCESS'}
            </span>
          </div>
          {stats.hasError && stats.errorMessage && (
            <div className="col-span-2">
              <span className="font-bold">Error:</span>{' '}
              <span className="text-red-600 dark:text-red-400">{stats.errorMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
