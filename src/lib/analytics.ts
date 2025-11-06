import ReactGA from 'react-ga4'

// Google Analytics Configuration
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID

/**
 * Initialize Google Analytics
 * Only initializes if VITE_GA_MEASUREMENT_ID environment variable is set
 */
export function initializeGA() {
  if (GA_MEASUREMENT_ID) {
    ReactGA.initialize(GA_MEASUREMENT_ID)
    console.log('✓ Google Analytics initialized:', GA_MEASUREMENT_ID)
  } else {
    console.warn('⚠ GA not initialized: VITE_GA_MEASUREMENT_ID environment variable not set')
  }
}

/**
 * Track a custom event in Google Analytics
 * @param category Event category
 * @param action Event action
 * @param label Optional event label
 * @param value Optional numeric value
 */
export function trackEvent(category: string, action: string, label?: string, value?: number) {
  if (!GA_MEASUREMENT_ID) return

  try {
    ReactGA.event({
      category,
      action,
      label,
      value,
    })
    console.log('📊 Event tracked:', { category, action, label, value })
  } catch (error) {
    console.error('Failed to track event:', error)
  }
}

/**
 * Track page view
 * @param path Page path
 * @param title Page title
 */
export function trackPageView(path: string, title?: string) {
  if (!GA_MEASUREMENT_ID) return

  try {
    ReactGA.send({
      hitType: 'pageview',
      page: path,
      title: title || document.title,
    })
    console.log('📊 Page view tracked:', path)
  } catch (error) {
    console.error('Failed to track page view:', error)
  }
}

/**
 * Track simulation event
 * @param success Whether simulation succeeded
 * @param chainId Chain ID if available
 */
export function trackSimulation(success: boolean, chainId?: number) {
  trackEvent('Simulation', success ? 'Success' : 'Failed', chainId?.toString())
}

/**
 * Track share event
 */
export function trackShare() {
  trackEvent('Share', 'Transaction Shared', 'PrivateBin')
}

/**
 * Track form data action (copy/paste)
 * @param action Action type
 */
export function trackFormAction(action: 'copy' | 'paste') {
  trackEvent('Form', action === 'copy' ? 'Copy Data' : 'Paste Data')
}
