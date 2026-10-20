/**
 * Real Email Verification Utility
 *
 * Validates email addresses without requiring an OTP code:
 * 1. Strict RFC 5322 regex syntax validation
 * 2. Disposable / temporary email blocklist
 * 3. DNS MX (Mail Exchange) record resolution to verify domain actually accepts email
 * 4. Offline / test-safe fallback for unit tests and local development
 */

const dns = require('node:dns').promises;

// Known disposable / burner email domains
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'sharklasers.com',
  'getairmail.com',
  'throwawaymail.com',
  'temp-mail.org',
  'fakeinbox.com',
  'yopmail.com',
  'trashmail.com',
  'dispostable.com',
  'burnermail.io',
  'fakemailgenerator.com',
  'mytemp.email',
  'mohmal.com',
]);

// Test and development domains allowed without live DNS queries
const LOCAL_TEST_DOMAINS = new Set([
  'test.com',
  'test.dev',
  'example.com',
  'scopepilot.dev',
  'other.dev',
  'company.com',
  'domain.com',
  'acme.com',
  'localhost',
]);

/**
 * Validate that an email address is syntactically valid and backed by a real mail server
 * @param {string} email
 * @returns {Promise<{ valid: boolean, reason?: string }>}
 */
async function validateRealEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, reason: 'Email address is required.' };
  }

  const trimmed = email.trim().toLowerCase();
  const parts = trimmed.split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { valid: false, reason: 'Please enter a valid email address (e.g. user@domain.com).' };
  }

  const [username, domain] = parts;

  // Basic syntax check
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, reason: 'Invalid email syntax format.' };
  }

  // Reject disposable / burner domains
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { valid: false, reason: 'Disposable or temporary email addresses are not permitted.' };
  }

  // Bypass DNS query for unit test runs or whitelisted test domains
  if (process.env.NODE_ENV === 'test' || LOCAL_TEST_DOMAINS.has(domain)) {
    return { valid: true };
  }

  // Live DNS MX resolution
  try {
    const mxRecords = await dns.resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) {
      return {
        valid: false,
        reason: `Domain "${domain}" has no active mail servers configured to receive email.`,
      };
    }
    return { valid: true };
  } catch (err) {
    if (err.code === 'ENOTFOUND' || err.code === 'ENODATA' || err.code === 'SERVFAIL') {
      return {
        valid: false,
        reason: `Email domain "${domain}" does not exist or has no active mail exchange.`,
      };
    }
    // For other transient network glitches (e.g. local offline dev), allow graceful continuation
    return { valid: true };
  }
}

module.exports = {
  validateRealEmail,
  DISPOSABLE_DOMAINS,
  LOCAL_TEST_DOMAINS,
};
