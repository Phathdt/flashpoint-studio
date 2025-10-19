import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Vercel serverless function to proxy Etherscan API requests
 * This avoids CORS issues when calling Etherscan from the browser
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get the target URL from the x-target-url header
    const targetUrl = req.headers['x-target-url'] as string

    if (!targetUrl) {
      return res.status(400).json({ error: 'Missing x-target-url header' })
    }

    // Validate that the URL is a valid URL
    let url: URL
    try {
      url = new URL(targetUrl)
    } catch {
      return res.status(400).json({ error: 'Invalid target URL' })
    }

    // Optional: Add security - only allow certain domains
    // Uncomment and customize if you want to restrict domains
    // const allowedDomains = ['etherscan.io', 'blockscout.com', 'optimex.xyz']
    // const isAllowed = allowedDomains.some(domain => url.hostname.endsWith(domain))
    // if (!isAllowed) {
    //   return res.status(403).json({ error: 'Domain not allowed' })
    // }

    console.log(`Proxying request to: ${url.toString()}`)

    // Make the request to the target API
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'Flashpoint-Studio',
        Accept: 'application/json',
      },
    })

    // Get the response data
    const data = await response.json()

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'X-Target-URL, Content-Type')

    // Return the response
    return res.status(response.status).json(data)
  } catch (error) {
    console.error('Proxy error:', error)
    return res.status(500).json({
      error: 'Failed to proxy request',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
