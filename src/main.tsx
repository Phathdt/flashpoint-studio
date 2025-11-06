import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './components/theme-provider'
import { initializeGA } from './lib/analytics'

// Initialize Google Analytics
initializeGA()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="theme">
      <App />
    </ThemeProvider>
  </StrictMode>
)
