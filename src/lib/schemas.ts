/**
 * Zod validation schemas for EVM tracing form
 */
import { z } from 'zod'
import { InputMode } from './constants'

// Base fields shared across both input modes
const baseFieldsSchema = z.object({
  rpcUrl: z.string().url({ message: 'Must be a valid URL' }),
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

// Block number validation - required in txHash mode, optional in manual mode
const blockNumberValidation = z.string().refine(
  (val) => {
    if (!val || val === '') return false
    // Allow decimal numbers or hex numbers (0x prefix)
    return /^\d+$/.test(val) || /^0x[0-9a-fA-F]+$/.test(val)
  },
  {
    message: 'Must be a valid block number (decimal or hex with 0x prefix)',
  }
)

// Manual mode schema - requires manual entry of all transaction details
const manualModeSchema = baseFieldsSchema.extend({
  inputMode: z.literal(InputMode.MANUAL),
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
  txHash: z.string().optional(),
})

// Transaction hash mode schema - requires transaction hash and block number
const txHashModeSchema = baseFieldsSchema.extend({
  inputMode: z.literal(InputMode.TX_HASH),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Must be a valid transaction hash'),
  blockNumber: blockNumberValidation, // Required in txHash mode
  // Auto-populated fields (not required in this mode)
  payload: z.string().optional(),
  fromAddress: z.string().optional(),
  toAddress: z.string().optional(),
})

// Discriminated union of both modes
export const evmTracingSchema = z.discriminatedUnion('inputMode', [
  manualModeSchema,
  txHashModeSchema,
])

// Infer TypeScript type from schema
export type EVMTracingFormData = z.infer<typeof evmTracingSchema>
