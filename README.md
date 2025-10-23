# ⚡ Flashpoint Studio

A powerful web-based debugging and tracing tool for Ethereum Virtual Machine (EVM) transactions. Flashpoint Studio enables developers to simulate and trace EVM transactions directly in the browser without requiring a backend server.

## ✨ Features

- 🔗 **Direct RPC Communication**: Execute `debug_traceCall` directly from the browser using ethers.js
- 🔍 **Transaction Tracing**: Comprehensive EVM transaction simulation and debugging
- 📦 **Automatic ABI Fetching**: Optional integration with Etherscan/Blockscout APIs to fetch contract ABIs and names
- 💾 **Persistent Caching**: IndexedDB-based caching for ABIs and contract names (7-day expiration) to minimize API calls
- ⚡ **Real-time Simulation**: Simulate transactions without deploying or interacting with actual contracts
- 🎨 **Modern UI**: Built with shadcn/ui components and Tailwind CSS for a clean, responsive interface

## 🛠️ Tech Stack

- ⚛️ **React 19** with TypeScript
- ⚡ **Vite 7** for blazing-fast development and optimized builds
- 🎨 **Tailwind CSS 4** for styling
- 🧩 **shadcn/ui** component library (New York variant)
- 💎 **ethers.js** for Ethereum interactions
- 📋 **React Hook Form** + **Zod** for form validation
- 🎯 **Radix UI** primitives

## 🚀 Getting Started

This project uses **pnpm** as the package manager.

### 📥 Installation

```bash
pnpm install
```

### 💻 Development

```bash
# Start development server with hot module replacement
pnpm dev
```

### 🏗️ Build

```bash
# Build for production (runs TypeScript compiler and Vite build)
pnpm build

# Preview production build locally
pnpm preview
```

### ✅ Code Quality

```bash
# Run ESLint to check code quality
pnpm lint

# Format code with Prettier
pnpm format
```

## 📁 Project Structure

```
src/
├── components/ui/    # shadcn/ui components
├── lib/              # Core services and utilities
│   ├── trace-client.ts        # RPC trace execution
│   ├── etherscan-client.ts    # Contract ABI fetching with caching
│   ├── indexeddb-cache.ts     # Persistent browser-side cache
│   ├── simulation-service.ts  # Main orchestration service
│   └── types.ts               # TypeScript type definitions
├── hooks/            # Custom React hooks
├── App.tsx           # Main application component
└── main.tsx          # Application entry point
```

## 🔄 How It Works

1. 📝 User provides RPC URL, contract addresses, transaction payload, and optional Etherscan configuration
2. 🎯 `SimulationService` orchestrates the tracing process
3. 🔍 Transaction is simulated using `debug_traceCall` RPC method
4. 📊 Contract addresses are extracted from the trace
5. 💾 System checks IndexedDB cache for previously fetched ABIs and contract names
6. 🔎 Missing ABIs and contract names are fetched from Etherscan and cached for 7 days
7. ✨ Results are displayed with detailed trace information including decoded function calls

## 🧩 Adding UI Components

This project uses shadcn/ui. To add new components:

```bash
npx shadcn@latest add <component-name>
```

Components will be automatically added to `src/components/ui/` with the project's configuration.

## ⚙️ Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
