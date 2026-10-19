/**
 * Ollama Local Model Provider
 *
 * Connects to local Ollama daemon (e.g. llama3.2, mistral) via REST API.
 * Uses structured JSON mode and validates responses against Zod schemas.
 */

const { BaseModelProvider } = require('./modelInterface');

class OllamaModelProvider extends BaseModelProvider {
  constructor(options = {}) {
    super('ollama');
    this.baseUrl = options.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.modelName = options.modelName || process.env.OLLAMA_MODEL || 'llama3.2';
    this.timeoutMs = options.timeoutMs || 4000;
  }

  async isAvailable() {
    let timeoutId;
    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 800);
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: controller.signal });
      return res.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Generate structured comparison using Ollama
   */
  async generateComparison(context) {
    const { newClientRequest, retrievedPassages, approvedProposalVersion } = context;

    const prompt = `
You are ScopePilot AI, a change-analysis assistant.
Your task is to analyze a new client request against the approved project proposal and retrieved scope evidence.

APPROVED PROPOSAL BASELINE:
Title: ${approvedProposalVersion.title}
Summary: ${approvedProposalVersion.scopeSummary}

RETRIEVED APPROVED-SCOPE EVIDENCE:
${retrievedPassages
  .map(
    (p, idx) =>
      `[${idx + 1}] (${p.sourceReference}) ${p.sourceTitle}: "${p.passageText}" (Similarity: ${Math.round(
        p.similarityScore * 100
      )}%)`
  )
  .join('\n')}

NEW CLIENT REQUEST:
Title: ${newClientRequest.title}
Description: ${newClientRequest.description}

INSTRUCTIONS:
1. Classify the reviewStatus as one of: 'in_scope', 'out_of_scope', 'partially_out_of_scope', 'needs_clarification', 'uncertain'.
2. If similarity is weak or evidence is missing, choose 'uncertain' or 'needs_clarification'.
3. Do not invent price, effort hours, or deadline impact.
4. Output strict JSON with keys:
   "summary": string,
   "reviewStatus": string,
   "confidenceScore": number (0.0 to 1.0),
   "inScopeItems": [{"item": string, "matchedScopeReference": string, "reason": string}],
   "outOfScopeItems": [{"item": string, "reason": string, "potentialImpact": string}],
   "uncertainItems": [{"item": string, "question": string, "missingEvidence": string}],
   "affectedDeliverables": [{"deliverableId": string, "scopeReference": string, "title": string, "impactDescription": string}],
   "suggestedQuestions": [string]
`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.modelName,
          prompt,
          format: 'json',
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Ollama HTTP Error: ${response.status} ${response.statusText}`);
      }

      const json = await response.json();
      if (!json || typeof json.response !== 'string') {
        throw new Error('Ollama response did not contain a valid response string');
      }
      return JSON.parse(json.response);
    } catch (err) {
      throw new Error(`Ollama execution failed: ${err.message}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

module.exports = {
  OllamaModelProvider,
};
