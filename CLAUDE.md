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
├── components/ui/    # shadcn/ui components (button, card, dialog, input, label, select)
├── lib/              # Utility functions (utils.ts for cn() helper)
├── hooks/            # Custom React hooks (configured but not yet populated)
├── App.tsx           # Main application component with EVM tracing form
├── main.tsx          # Application entry point
└── index.css         # Global styles and Tailwind directives
```

### Path Aliases
The project uses @ alias for imports:
- `@/components` → `src/components`
- `@/lib` → `src/lib`
- `@/hooks` → `src/hooks`
- `@/ui` → `src/components/ui`

Configured in vite.config.ts:10

### Form Validation Architecture
The application uses Zod schemas for form validation. The EVM tracing form schema validates:
- RPC URLs (must be valid URLs)
- Ethereum addresses (must match `0x` + 40 hex characters pattern)
- Payload data (required field)
- Optional Etherscan configuration

Schema definition: src/App.tsx:9-16

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
- `trace-client.ts` - Executes `debug_traceCall` RPC method to get transaction traces
- `etherscan-client.ts` - Fetches contract ABIs and names from Etherscan/Blockscout APIs with IndexedDB caching
- `simulation-service.ts` - Main service orchestrating trace execution and ABI fetching
- `indexeddb-cache.ts` - Persistent browser-side cache for ABIs and contract names (7-day expiration)
- `privatebin-client.ts` - End-to-end encrypted sharing via PrivateBin (uses @pixelfactory/privatebin)
- `types.ts` - TypeScript interfaces for trace data structures

**Components** (src/components/):
- `TraceVisualizer.tsx` - Renders transaction trace as a tree structure with decoded function calls
- `ShareModal.tsx` - Modal dialog for sharing with copy-to-clipboard functionality
- `ui/` - shadcn/ui component library (New York variant)

**Key Features**:
- Direct RPC communication using ethers.js from the browser
- Support for `debug_traceCall` with automatic fallback if not supported
- Optional Etherscan integration for automatic ABI and contract name fetching
- Persistent IndexedDB caching to minimize API calls and improve performance
- End-to-end encrypted sharing via PrivateBin with 7-day expiration
- Copy/paste form data to clipboard as JSON for quick configuration duplication
- URL parameter-based auto-fill for shared transactions
- Comprehensive error handling and decoding
- Real-time transaction simulation without backend

**Caching Architecture**:
- All fetched ABIs and contract names are stored in IndexedDB via a singleton cache instance
- Cache is persistent across browser sessions and page reloads
- Chain-aware caching: different chains have separate cache entries (using chainId)
- Automatic cache expiration after 7 days
- `EtherscanClient` uses **only** IndexedDB (no in-memory cache) to ensure consistency
- On each simulation, `fetchMultipleAbis()` and `fetchMultipleContractNames()` check IndexedDB first before making API calls

**Data Flow**:
1. User submits form with RPC URL, addresses, payload, and optional Etherscan config
2. `SimulationService` creates `TraceClient` and `EtherscanClient` instances (each simulation creates new instances)
3. Transaction is traced using `debug_traceCall` RPC method
4. Contract addresses are extracted from trace
5. For each address, `EtherscanClient` checks IndexedDB cache first, then fetches from Etherscan API if not cached
6. Fetched ABIs/names are stored in IndexedDB for future use
7. Results are displayed with success/error status and trace details

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
- Contract addresses with Etherscan links
- Decoded function signatures and parameters
- Input/output data and error information
- Gas usage statistics

**Important**: When rendering nested calls recursively, ensure React keys include both the call frame properties AND the index to prevent duplicate key warnings. The key format is: `${from}-${to}-${depth}-${index}`

## Adding New shadcn/ui Components

Use the shadcn/ui CLI to add new components:
```bash
npx shadcn@latest add <component-name>
```

Components will be automatically added to `src/components/ui/` with proper configuration based on components.json settings.

## TypeScript Configuration

The project uses TypeScript 5.9 with a reference-based configuration:
- `tsconfig.app.json` - Application code configuration
- `tsconfig.node.json` - Build tooling configuration
- `tsconfig.json` - Root configuration file that references both

## ESLint Configuration

ESLint is configured with:
- TypeScript ESLint recommended rules
- React Hooks recommended-latest rules
- React Refresh Vite plugin rules
- Ignores `dist` directory

Strict type checking is not enabled by default (see README.md for instructions on enabling type-aware lint rules).
