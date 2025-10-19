# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Flashpoint Studio is an EVM Tracing Debugger built with React, TypeScript, and Vite. The application provides a web interface for debugging and tracing Ethereum Virtual Machine (EVM) transactions.

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
- `etherscan-client.ts` - Fetches contract ABIs and names from Etherscan/Blockscout APIs
- `simulation-service.ts` - Main service orchestrating trace execution and ABI fetching
- `types.ts` - TypeScript interfaces for trace data structures

**Key Features**:
- Direct RPC communication using ethers.js from the browser
- Support for `debug_traceCall` with automatic fallback if not supported
- Optional Etherscan integration for automatic ABI and contract name fetching
- Comprehensive error handling and decoding
- Real-time transaction simulation without backend

**Data Flow**:
1. User submits form with RPC URL, addresses, payload, and optional Etherscan config
2. `SimulationService` creates `TraceClient` and `EtherscanClient` instances
3. Transaction is traced using `debug_traceCall` RPC method
4. Contract addresses are extracted from trace
5. ABIs and contract names are fetched from Etherscan (if configured)
6. Results are displayed with success/error status and trace details

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
