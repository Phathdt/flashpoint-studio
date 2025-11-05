# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Flashpoint Studio is a web-based debugging and tracing tool for Ethereum Virtual Machine (EVM) transactions, built with React, TypeScript, and Vite.

## Development Commands

**This project uses pnpm as the package manager.**

```bash
# Start development server with hot module replacement
pnpm dev

# Build for production (runs TypeScript compiler and Vite build)
pnpm build

# Run ESLint to check code quality
pnpm lint

# Format code with Prettier
pnpm format

# Preview production build locally
pnpm preview

# Run tests with Vitest
pnpm test

# Run tests with UI (interactive mode)
pnpm test:ui

# Generate test coverage report
pnpm test:coverage
```

## Testing

The project uses **Vitest** with React Testing Library for unit and integration testing:

- **Test Configuration**: `vitest.config.ts`
- **Test Setup**: `src/test/setup.ts`
- **Test Environment**: jsdom (simulates browser environment)
- **Coverage Provider**: v8
- **Test Location**: `src/**/__tests__/*.test.{ts,tsx}`

**Running specific tests**:
```bash
# Run tests in a specific file
pnpm test src/hooks/__tests__/useSimulation.test.ts

# Run tests in watch mode
pnpm test --watch

# Run tests with coverage for specific files
pnpm test:coverage --include=src/hooks/**
```

## Project Architecture

### Tech Stack
- **Frontend Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 4 (with @tailwindcss/vite plugin)
- **UI Components**: shadcn/ui (New York style variant)
- **Form Handling**: React Hook Form with Zod validation
- **Component Library**: Radix UI primitives

### Directory Structure
```
src/
├── components/
│   ├── ui/                      # shadcn/ui components (button, card, dialog, input, label, select, progress, sonner)
│   ├── TraceVisualizer.tsx      # Tree-based trace visualization with click-to-copy
│   ├── TransferVisualizer.tsx   # Token transfer summary visualization
│   ├── ShareModal.tsx           # PrivateBin sharing modal
│   ├── SimulationProgress.tsx   # Multi-step progress indicator
│   ├── Settings.tsx             # Application settings dialog
│   ├── theme-provider.tsx       # Dark mode theme context
│   └── theme-toggle.tsx         # Dark mode toggle button
├── lib/
│   ├── trace-client.ts          # RPC trace execution (debug_traceCall)
│   ├── etherscan-client.ts      # Contract ABI/name fetching with caching
│   ├── simulation-service.ts    # Main orchestration service
│   ├── indexeddb-cache.ts       # Persistent browser-side cache
│   ├── privatebin-client.ts     # Encrypted sharing via PrivateBin
│   ├── trace-parser.ts          # Parse raw traces into structured data
│   ├── function-decoder.ts      # Decode function calls using ABIs
│   ├── transfer-detector.ts     # Detect ERC-20 token transfers
│   ├── token-metadata-client.ts # Fetch token name/symbol/decimals
│   ├── rate-limiter.ts          # API request rate limiting
│   ├── etherscan-utils.ts       # Etherscan URL helpers
│   ├── types.ts                 # TypeScript type definitions
│   └── utils.ts                 # General utilities (cn() helper)
├── hooks/
│   ├── __tests__/               # Hook unit tests
│   ├── useSimulation.ts         # Transaction simulation hook
│   ├── useShareTransaction.ts   # PrivateBin sharing hook
│   ├── useLoadSharedTransaction.ts  # Load shared transaction from URL
│   ├── useClipboardForm.ts      # Copy/paste form data hook
│   ├── useContainerSize.ts      # Container dimension tracking hook
│   ├── useCopyToClipboard.ts    # Generic copy-to-clipboard hook
│   ├── types.ts                 # Hook type definitions
│   └── index.ts                 # Hook exports
├── test/
│   └── setup.ts                 # Vitest test setup
├── App.tsx                      # Main application component
├── main.tsx                     # Application entry point
└── index.css                    # Global styles and Tailwind directives

api/
└── etherscan.ts                 # Vercel serverless function for CORS proxy
```

### Path Aliases
The project uses @ alias for imports:
- `@/components` → `src/components`
- `@/lib` → `src/lib`
- `@/hooks` → `src/hooks`
- `@/ui` → `src/components/ui`

Configured in vite.config.ts:10

### Custom Hooks Architecture

The application follows a hooks-based architecture for state management and business logic:

**Key hooks** (`src/hooks/`):
- `useSimulation` - Manages EVM trace simulation execution via `SimulationService`. Handles loading states, progress tracking, error handling, and success/error toast notifications. Caches service instance for performance.
- `useShareTransaction` - Handles encrypted sharing via PrivateBin. Serializes form data and simulation results with BigInt support, encrypts client-side, and generates share URLs.
- `useLoadSharedTransaction` - Loads and decrypts shared transactions from URL parameters on component mount. Auto-fills form data when `?share=` parameter is detected.
- `useClipboardForm` - Manages copy/paste of form configurations as JSON. Handles serialization and deserialization with proper error handling.
- `useContainerSize` - Tracks container dimensions using ResizeObserver for responsive rendering.
- `useCopyToClipboard` - Generic clipboard utility with toast notifications.

**All hooks export TypeScript types** from `src/hooks/types.ts` for type-safe usage.

### Form Validation Architecture
The application uses Zod schemas for form validation. The EVM tracing form schema validates:
- RPC URLs (must be valid URLs)
- Ethereum addresses (must match `0x` + 40 hex characters pattern)
- Payload data (required field)
- Block numbers (decimal or hex with 0x prefix)
- Optional Etherscan configuration (API URL, explorer URL, API key)

Schema definition: src/App.tsx:23-66

### shadcn/ui Configuration
Components are configured with:
- Style: "new-york"
- CSS Variables: enabled
- Base Color: neutral
- TypeScript: enabled
- No RSC (client-side only)

Configuration: components.json

### EVM Tracing Implementation
The application implements a complete EVM transaction tracing and debugging system:

**Core Services** (src/lib/):
- `simulation-service.ts` - Main orchestration service coordinating all simulation steps with 7-step progress tracking
- `trace-client.ts` - Executes `debug_traceCall` RPC method with timeout support and automatic fallback
- `trace-parser.ts` - Parses raw trace data into structured call frames with statistics
- `function-decoder.ts` - Decodes function calls and parameters using contract ABIs
- `etherscan-client.ts` - Fetches contract ABIs and names from Etherscan/Blockscout APIs with rate limiting
- `transfer-detector.ts` - Detects ERC-20 token transfers (transfer/transferFrom) from traces
- `token-metadata-client.ts` - Fetches token metadata (name, symbol, decimals) with caching
- `indexeddb-cache.ts` - Persistent browser-side cache for ABIs, contract names, and token metadata (7-day expiration)
- `privatebin-client.ts` - End-to-end encrypted sharing via PrivateBin (uses @pixelfactory/privatebin)
- `rate-limiter.ts` - Token bucket rate limiter for API requests
- `etherscan-utils.ts` - Chain-specific Etherscan URL mapping and helpers
- `types.ts` - TypeScript interfaces for trace data structures

**Components** (src/components/):
- `TraceVisualizer.tsx` - Renders transaction trace as a tree structure with decoded function calls and click-to-copy values
- `TransferVisualizer.tsx` - Displays detected token transfers with formatted amounts and metadata
- `ShareModal.tsx` - Modal dialog for sharing with copy-to-clipboard functionality
- `SimulationProgress.tsx` - Multi-step progress bar with status messages
- `Settings.tsx` - Settings dialog for Etherscan configuration
- `ui/` - shadcn/ui component library (New York variant)

**Key Features**:
- Direct RPC communication using ethers.js from the browser
- Support for `debug_traceCall` with automatic fallback if not supported
- Token transfer detection with automatic metadata fetching (ERC-20)
- Optional Etherscan integration for automatic ABI and contract name fetching
- Persistent IndexedDB caching to minimize API calls and improve performance
- Rate-limited API requests to avoid hitting Etherscan limits
- End-to-end encrypted sharing via PrivateBin with 7-day expiration
- Copy/paste form data to clipboard as JSON for quick configuration duplication
- Click-to-copy trace values (addresses, function parameters, etc.)
- URL parameter-based auto-fill for shared transactions
- Multi-step progress tracking for long-running simulations
- Dark mode support with next-themes
- Comprehensive error handling and decoding
- Real-time transaction simulation without backend

**Caching Architecture**:
- All fetched ABIs, contract names, and token metadata are stored in IndexedDB via a singleton cache instance
- Cache is persistent across browser sessions and page reloads
- Chain-aware caching: different chains have separate cache entries (using chainId)
- Automatic cache expiration after 7 days
- `EtherscanClient` and `TokenMetadataClient` use **only** IndexedDB (no in-memory cache) to ensure consistency
- On each simulation, `fetchMultipleAbis()`, `fetchMultipleContractNames()`, and `fetchTokenMetadata()` check IndexedDB first before making API calls

**Data Flow** (7 steps with progress tracking):
1. **Validate inputs** - Verify addresses and calldata format
2. **Connect to RPC** - Establish provider connection and detect chain ID
3. **Execute trace** - Run `debug_traceCall` with specified block tag
4. **Fetch ABIs and names** - Parallel fetch from Etherscan (cache-first) for all contract addresses
5. **Parse trace** - Decode function calls and build call tree
6. **Detect transfers** - Find ERC-20 transfers and fetch token metadata
7. **Complete** - Display results with trace visualization and transfer summary

### Sharing Architecture

**Component**: `src/components/ShareModal.tsx`
**Service**: `src/lib/privatebin-client.ts`

The application supports encrypted sharing of transaction configurations and simulation results:

**How it works**:
1. User clicks "Share" button to create an encrypted paste on PrivateBin (https://privatebin.net)
2. Transaction data (payload, addresses, optional simulation results) is serialized with BigInt handling
3. Data is encrypted client-side with a random 32-byte key using AES-256
4. Encrypted paste is uploaded to PrivateBin with 7-day expiration
5. A compact share URL is generated: `pasteId#base58EncodedKey`
6. Two share options are provided:
   - **Application share link**: `https://app.url?share=pasteId#key` (auto-fills form on load)
   - **Direct PrivateBin link**: `https://privatebin.net/?pasteId#key` (view raw encrypted data)
7. Copy-to-clipboard buttons use the Clipboard API with visual feedback (check icon)

**Security notes**:
- RPC URLs are intentionally NOT shared (may contain API keys)
- Encryption key never leaves the browser (stored in URL hash fragment)
- PrivateBin server cannot decrypt the data
- Pastes auto-expire after 7 days

### Copy/Paste Form Data

The application provides copy/paste buttons to quickly duplicate form configurations:

**Copy button** (`src/App.tsx:250-276`):
- Collects all current form values (RPC URL, addresses, payload, block number, Etherscan config)
- Serializes to formatted JSON (2-space indentation)
- Writes to clipboard using `navigator.clipboard.writeText()`
- Shows success toast notification

**Paste button** (`src/App.tsx:278-305`):
- Reads JSON from clipboard using `navigator.clipboard.readText()`
- Parses JSON and validates structure
- Sets each form field individually using React Hook Form's `setValue()`
- Shows success toast on successful paste, error toast on failure

**Use cases**:
- Quick backup of current configuration before making changes
- Duplicate configurations for testing variations
- Share configurations via other channels (Slack, email, etc.)
- Restore previously saved configurations

**Button location**: Form action buttons row alongside Share and Simulate buttons

### Trace Visualization

**Component**: `src/components/TraceVisualizer.tsx`

Renders the parsed transaction trace in a tree structure showing:
- Call hierarchy with visual connectors (├─, └─, │)
- Call types (CALL, DELEGATECALL, STATICCALL, etc.)
- Contract addresses with Etherscan links and contract names
- Decoded function signatures and parameters
- Click-to-copy functionality for all parameter values
- Input/output data and error information
- Gas usage statistics

**Component**: `src/components/TransferVisualizer.tsx`

Displays detected ERC-20 token transfers:
- From/To addresses with contract names
- Token symbol and formatted amounts
- Filters out UNKNOWN tokens (metadata fetch failures)
- Click-to-copy for addresses

**Important**: When rendering nested calls recursively, ensure React keys include both the call frame properties AND the index to prevent duplicate key warnings. The key format is: `${from}-${to}-${depth}-${index}`

### Token Transfer Detection

The application automatically detects ERC-20 token transfers in transaction traces:

**Detection mechanism** (`src/lib/transfer-detector.ts`):
- Scans all call frames for `transfer(address,uint256)` (selector: `0xa9059cbb`)
- Scans all call frames for `transferFrom(address,address,uint256)` (selector: `0x23b872dd`)
- Recursively traverses nested calls to find all transfers

**Metadata fetching** (`src/lib/token-metadata-client.ts`):
- Fetches token name, symbol, and decimals from contract
- Uses IndexedDB caching with 7-day expiration
- 5-second timeout per token to avoid blocking
- Graceful fallback to "UNKNOWN" for failed fetches

**Amount formatting**:
- Formats token amounts using decimals (e.g., `1000000` with 6 decimals → `1.0`)
- Limits fractional display to 6 decimals for readability
- Handles BigInt values correctly

## Adding New shadcn/ui Components

Use the shadcn/ui CLI to add new components:
```bash
npx shadcn@latest add <component-name>
```

Components will be automatically added to `src/components/ui/` with proper configuration based on components.json settings.

## TypeScript Configuration

The project uses TypeScript 5.9 with a reference-based configuration:
- `tsconfig.app.json` - Application code configuration
- `tsconfig.api.json` - API/serverless function configuration
- `tsconfig.node.json` - Build tooling configuration
- `tsconfig.json` - Root configuration file that references both

## ESLint Configuration

ESLint is configured with:
- TypeScript ESLint recommended rules
- React Hooks recommended-latest rules
- React Refresh Vite plugin rules
- Ignores `dist` directory

Strict type checking is not enabled by default (see README.md for instructions on enabling type-aware lint rules).

## Deployment

### Vercel Deployment

The project includes Vercel-specific configurations:

**API Proxy** (`api/etherscan.ts`):
- Vercel serverless function to proxy Etherscan API requests
- Solves CORS issues when calling Etherscan from the browser
- Target URL passed via `x-target-url` header
- Supports any Etherscan-compatible API (Etherscan, Blockscout, etc.)

**Configuration** (`vercel.json`):
- Rewrites `/api/etherscan/*` to the serverless function

**Local development proxy** (`vite.config.ts:14-35`):
- Vite dev server includes proxy configuration for `/api/etherscan`
- Mirrors production behavior in development
- Dynamically routes requests based on `x-target-url` header

### Rate Limiting

**Implementation** (`src/lib/rate-limiter.ts`):
- Token bucket algorithm for API rate limiting
- Configurable requests per second
- Used by `EtherscanClient` to avoid hitting API limits
- Default: 5 requests/second for Etherscan API

### Browser Compatibility

The application requires:
- Modern browser with IndexedDB support
- Clipboard API support for copy/paste features
- ResizeObserver API for responsive rendering
- No Internet Explorer support (uses modern ES6+ features)
