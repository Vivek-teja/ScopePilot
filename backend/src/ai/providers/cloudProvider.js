/**
 * Cloud Model Provider (Free Tier APIs)
 *
 * Supports Google Gemini Free Tier, Groq Free Cloud, and Hugging Face.
 * Implements native fetch with timeout guards and JSON structured output.
 *
 * AUDIT FIXES:
 * - Gemini: API key moved from URL query parameter (?key=) to x-goog-api-key header
 *   to prevent key leakage in proxy logs and server-side request logs.
 * - Both providers: credential redaction in error messages ([REDACTED]) so API keys
 *   are never exposed in exception messages or log files.
 * - Both providers: explicit null/undefined content checks with descriptive errors
 *   before JSON.parse to avoid opaque "undefined is not valid JSON" errors.
 * - Timeout: clearTimeout moved to finally block so it always fires regardless of branch.
 */

const { BaseModelProvider } = require('./modelInterface');

class CloudModelProvider extends BaseModelProvider {
  constructor(providerType = 'gemini', options = {}) {
    super(providerType);
    this.providerType = providerType;
    this.apiKey =
      options.apiKey ||
      process.env[`${providerType.toUpperCase()}_API_KEY`] ||
      '';
    this.timeoutMs = options.timeoutMs || 5000;
  }

  async isAvailable() {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async generateComparison(context) {
    if (!this.apiKey) {
      throw new Error(`API Key for ${this.providerType} is not configured.`);
    }

    if (this.providerType === 'groq') {
      return this._callGroq(context);
    }

    return this._callGemini(context);
  }

  async _callGemini(context) {
    const { newClientRequest, retrievedPassages, approvedProposalVersion } = context;
    // S3: model name configurable via GEMINI_MODEL env var (default: gemini-1.5-flash)
    // Verify current model availability at: https://ai.google.dev/gemini-api/docs/models
    const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    // AUDIT FIX: API key in x-goog-api-key header, NOT in URL query string
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const prompt = `
Analyze this client change request against approved baseline scope.
Approved Scope: ${approvedProposalVersion.title} - ${approvedProposalVersion.scopeSummary}
Retrieved Passages:
${retrievedPassages.map((p) => `[${p.sourceReference}] ${p.sourceTitle}: ${p.passageText}`).join('\n')}
New Client Request: ${newClientRequest.title} - ${newClientRequest.description}

Output ONLY valid JSON matching this schema:
{
  "summary": string,
  "reviewStatus": "in_scope" | "out_of_scope" | "partially_out_of_scope" | "needs_clarification" | "uncertain",
  "confidenceScore": number (0.0 to 1.0),
  "inScopeItems": [{"item": string, "matchedScopeReference": string, "reason": string}],
  "outOfScopeItems": [{"item": string, "reason": string, "potentialImpact": string}],
  "uncertainItems": [{"item": string, "question": string, "missingEvidence": string}],
  "affectedDeliverables": [{"deliverableId": string, "scopeReference": string, "title": string, "impactDescription": string}],
  "suggestedQuestions": [string]
}
`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // AUDIT FIX: API key in x-goog-api-key header (not URL query parameter)
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Gemini API Error: ${response.status}`);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      // AUDIT FIX: Explicit null check with descriptive error before JSON.parse
      if (!rawText) {
        throw new Error('Gemini response contained no candidate text parts');
      }
      return JSON.parse(rawText);
    } catch (err) {
      // AUDIT FIX: Redact API key if it appears in error messages
      const safeMessage = this.apiKey ? err.message.replaceAll(this.apiKey, '[REDACTED]') : err.message;
      throw new Error(`Gemini request failed: ${safeMessage}`);
    } finally {
      // AUDIT FIX: clearTimeout in finally block so it always fires
      clearTimeout(timeoutId);
    }
  }

  async _callGroq(context) {
    const { newClientRequest, retrievedPassages, approvedProposalVersion } = context;
    const url = 'https://api.groq.com/openai/v1/chat/completions';

    const systemPrompt =
      'You are ScopePilot AI, a change-analysis assistant. Output strict JSON with keys: summary, reviewStatus, confidenceScore, inScopeItems, outOfScopeItems, uncertainItems, affectedDeliverables, suggestedQuestions.';

    const userPrompt = `
Approved Scope: ${approvedProposalVersion.title} - ${approvedProposalVersion.scopeSummary}
Retrieved Passages:
${retrievedPassages.map((p) => `[${p.sourceReference}] ${p.sourceTitle}: ${p.passageText}`).join('\n')}
New Client Request: ${newClientRequest.title} - ${newClientRequest.description}
`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          // S3: model name configurable via GROQ_MODEL env var (default: llama-3.1-8b-instant)
          // Verify current model availability at: https://console.groq.com/docs/models
          model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Groq API Error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      // AUDIT FIX: Explicit null check with descriptive error before JSON.parse
      if (!content) {
        throw new Error('Groq response contained no message content');
      }
      return JSON.parse(content);
    } catch (err) {
      // AUDIT FIX: Redact API key if it appears in error messages
      const safeMessage = this.apiKey ? err.message.replaceAll(this.apiKey, '[REDACTED]') : err.message;
      throw new Error(`Groq request failed: ${safeMessage}`);
    } finally {
      // AUDIT FIX: clearTimeout in finally block so it always fires
      clearTimeout(timeoutId);
    }
  }
}

module.exports = {
  CloudModelProvider,
};
