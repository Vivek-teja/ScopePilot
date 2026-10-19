/**
 * Cloud Model Provider (Free Tier APIs)
 *
 * Supports Google Gemini Free Tier, Groq Free Cloud, and Hugging Face.
 * Implements native fetch with timeout guards and JSON structured output.
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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Gemini API Error: ${response.status}`);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return JSON.parse(rawText);
    } catch (err) {
      clearTimeout(timeoutId);
      throw new Error(`Gemini request failed: ${err.message}`);
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
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Groq API Error: ${response.status}`);
      }

      const data = await response.json();
      return JSON.parse(data.choices?.[0]?.message?.content);
    } catch (err) {
      clearTimeout(timeoutId);
      throw new Error(`Groq request failed: ${err.message}`);
    }
  }
}

module.exports = {
  CloudModelProvider,
};
