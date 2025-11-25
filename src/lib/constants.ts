/**
 * Input mode constants for the EVM tracing form
 * Using const object instead of enum due to erasableSyntaxOnly: true in tsconfig
 */
export const InputMode = {
  MANUAL: 'manual',
  TX_HASH: 'txHash',
} as const

export type InputMode = (typeof InputMode)[keyof typeof InputMode]
