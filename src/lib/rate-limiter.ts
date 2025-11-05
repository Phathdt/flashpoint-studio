/**
 * Token bucket rate limiter for API requests
 *
 * Ensures requests are spaced out to respect API rate limits
 */
export class RateLimiter {
  private tokens: number
  private maxTokens: number
  private refillRate: number // tokens per second
  private lastRefillTime: number
  private queue: Array<() => void> = []
  private isProcessing = false

  /**
   * @param requestsPerSecond Maximum requests per second
   * @param burstSize Maximum burst size (optional, defaults to requestsPerSecond)
   */
  constructor(requestsPerSecond: number, burstSize?: number) {
    this.maxTokens = burstSize || requestsPerSecond
    this.tokens = this.maxTokens
    this.refillRate = requestsPerSecond
    this.lastRefillTime = Date.now()
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refillTokens(): void {
    const now = Date.now()
    const elapsedSeconds = (now - this.lastRefillTime) / 1000
    const tokensToAdd = elapsedSeconds * this.refillRate

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd)
    this.lastRefillTime = now
  }

  /**
   * Process the next request in queue
   */
  private processQueue(): void {
    if (this.isProcessing || this.queue.length === 0) {
      return
    }

    this.isProcessing = true
    this.refillTokens()

    if (this.tokens >= 1) {
      // Consume a token and process request
      this.tokens -= 1
      const resolve = this.queue.shift()
      if (resolve) {
        resolve()
      }

      // Process next request after a small delay to maintain rate
      const delayMs = 1000 / this.refillRate
      setTimeout(() => {
        this.isProcessing = false
        this.processQueue()
      }, delayMs)
    } else {
      // Wait until we have a token
      const waitTime = ((1 - this.tokens) / this.refillRate) * 1000
      setTimeout(() => {
        this.isProcessing = false
        this.processQueue()
      }, waitTime)
    }
  }

  /**
   * Wait for rate limit permission
   * @returns Promise that resolves when the request can proceed
   */
  async acquire(): Promise<void> {
    this.refillTokens()

    if (this.tokens >= 1) {
      this.tokens -= 1
      return Promise.resolve()
    }

    // Add to queue and wait
    return new Promise<void>((resolve) => {
      this.queue.push(resolve)
      this.processQueue()
    })
  }

  /**
   * Execute a function with rate limiting
   * @param fn Function to execute
   * @returns Promise with the function result
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire()
    return fn()
  }
}
