import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock IndexedDB
global.indexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
  databases: vi.fn(),
  cmp: vi.fn(),
} as unknown as IDBFactory

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.localStorage = localStorageMock as unknown as Storage

// Mock Clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
    readText: vi.fn(() => Promise.resolve('')),
  },
})
