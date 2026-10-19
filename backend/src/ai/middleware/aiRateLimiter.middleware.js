/**
 * AI Rate Limiter Middleware
 *
 * Implements an in-memory per-user (authenticated) and per-IP (unauthenticated)
 * sliding-window rate limiter for AI provider-calling routes.
 *
 * Design goals:
 * - Zero additional npm dependencies (uses only Node.js built-ins + Express)
 * - Per-user bucketing when a JWT is present; per-IP fallback for public endpoints
 * - Configurable window and max-calls
 * - Returns 429 with Retry-After header before any provider call is made
 * - In-memory (lost on restart) — acceptable for a single-instance dev/staging server
 *   If you scale to multiple instances, replace with Redis-backed storage
 */

/** @type {Map<string, {count: number, windowStart: number}>} */
const _windows = new Map();

// Cap map size to prevent unbounded growth (LRU-style eviction when full)
const MAX_BUCKETS = 5000;

/**
 * Evict the oldest half of buckets when the map is full.
 * Simple strategy: convert to array sorted by windowStart, keep newest half.
 */
function _evictOldBuckets() {
  if (_windows.size < MAX_BUCKETS) return;
  const entries = [..._windows.entries()].sort((a, b) => a[1].windowStart - b[1].windowStart);
  const keepFrom = Math.floor(entries.length / 2);
  _windows.clear();
  for (let i = keepFrom; i < entries.length; i++) {
    _windows.set(entries[i][0], entries[i][1]);
  }
}

/**
 * Create an Express rate-limiter middleware.
 *
 * @param {object} options
 * @param {number} [options.windowMs=60000]  Sliding window in milliseconds (default: 1 min)
 * @param {number} [options.max=20]          Max calls per window per bucket (default: 20)
 * @param {string} [options.message]         Custom error message
 * @returns {import('express').RequestHandler}
 */
function createAiRateLimiter(options = {}) {
  const windowMs = options.windowMs || 60 * 1000; // 1 minute default
  const max = options.max || 20;
  const message =
    options.message ||
    'Too many AI requests from this account. Please wait before trying again.';

  return function aiRateLimiter(req, res, next) {
    // Bucket key: prefer authenticated user ID, fallback to IP
    const bucketKey = req.user ? `user:${req.user._id}` : `ip:${req.ip}`;
    const now = Date.now();

    _evictOldBuckets();

    let bucket = _windows.get(bucketKey);

    if (!bucket || now - bucket.windowStart >= windowMs) {
      // Start a fresh window
      bucket = { count: 1, windowStart: now };
      _windows.set(bucketKey, bucket);
      return next();
    }

    bucket.count += 1;

    if (bucket.count > max) {
      const retryAfterSec = Math.ceil((bucket.windowStart + windowMs - now) / 1000);
      res.set('Retry-After', String(retryAfterSec));
      res.set('X-RateLimit-Limit', String(max));
      res.set('X-RateLimit-Remaining', '0');
      res.set('X-RateLimit-Reset', String(Math.ceil((bucket.windowStart + windowMs) / 1000)));
      return res.status(429).json({
        success: false,
        message,
        retryAfterSeconds: retryAfterSec,
      });
    }

    res.set('X-RateLimit-Limit', String(max));
    res.set('X-RateLimit-Remaining', String(max - bucket.count));
    return next();
  };
}

/**
 * Rate limiter for authenticated provider-calling AI routes.
 * 20 calls per user per minute — generous for interactive use, blocks abuse.
 */
const aiProviderRateLimit = createAiRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Too many AI provider requests. Please wait 1 minute before retrying.',
});

/**
 * Stricter rate limiter for the benchmark endpoint (runs 5 provider calls at once).
 * 5 benchmark runs per user per 5 minutes.
 */
const aiBenchmarkRateLimit = createAiRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: 'Benchmark rate limit exceeded. The benchmark runs 5 provider calls per request; please wait 5 minutes.',
});

// Export the factory too so tests can create custom instances
module.exports = {
  createAiRateLimiter,
  aiProviderRateLimit,
  aiBenchmarkRateLimit,
  // Expose the internal map only for tests — do not use in production code
  _windows,
};
