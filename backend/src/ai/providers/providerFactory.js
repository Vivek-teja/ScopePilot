/**
 * AI Provider Factory & Manager
 *
 * Implements Review 4 multi-provider architecture:
 * - Abstracts local Ollama, Cloud Free APIs (Gemini, Groq), and Local Heuristic engine.
 * - Handles provider health checks, runtime switching, and automatic fallback.
 */

const { LocalModelProvider } = require('./localProvider');
const { OllamaModelProvider } = require('./ollamaProvider');
const { CloudModelProvider } = require('./cloudProvider');

class ProviderFactory {
  constructor() {
    this.localProvider = new LocalModelProvider();
    this.ollamaProvider = new OllamaModelProvider();
    this.geminiProvider = new CloudModelProvider('gemini');
    this.groqProvider = new CloudModelProvider('groq');

    this.activeProviderName = process.env.AI_PROVIDER || 'local';
  }

  /**
   * Get list of all providers with their live availability status
   */
  async getProvidersStatus() {
    const [ollamaOk, geminiOk, groqOk] = await Promise.all([
      this.ollamaProvider.isAvailable(),
      this.geminiProvider.isAvailable(),
      this.groqProvider.isAvailable(),
    ]);

    return {
      activeProvider: this.activeProviderName,
      providers: [
        {
          name: 'local',
          label: 'ScopePilot Built-in Grounded Engine',
          isAvailable: true,
          type: 'embedded',
          description: 'Zero-latency deterministic semantic reasoning engine (zero network dependency).',
        },
        {
          name: 'ollama',
          label: 'Local Ollama Daemon',
          isAvailable: ollamaOk,
          type: 'local_daemon',
          description: 'Local open-source LLM inference (e.g. llama3.2, mistral).',
          endpoint: this.ollamaProvider.baseUrl,
        },
        {
          name: 'gemini',
          label: 'Google Gemini Free API',
          isAvailable: geminiOk,
          type: 'cloud_free',
          description: 'Google AI Studio Gemini 1.5 Flash Free Tier (1500 RPD).',
        },
        {
          name: 'groq',
          label: 'Groq Cloud Free API',
          isAvailable: groqOk,
          type: 'cloud_free',
          description: 'Ultra-fast LPU Cloud inference (llama-3.1-8b-instant).',
        },
      ],
    };
  }

  /**
   * Switch the active provider
   */
  setActiveProvider(providerName) {
    const valid = ['local', 'ollama', 'gemini', 'groq'];
    if (!valid.includes(providerName)) {
      throw new Error(`Invalid provider "${providerName}". Supported: ${valid.join(', ')}`);
    }
    this.activeProviderName = providerName;
    return this.activeProviderName;
  }

  /**
   * Resolve appropriate provider with automatic fallback protection
   */
  async getProvider(preferredName) {
    const target = preferredName || this.activeProviderName;

    if (target === 'ollama') {
      const ok = await this.ollamaProvider.isAvailable();
      if (ok) return { provider: this.ollamaProvider, fallbackUsed: false };
    } else if (target === 'gemini') {
      const ok = await this.geminiProvider.isAvailable();
      if (ok) return { provider: this.geminiProvider, fallbackUsed: false };
    } else if (target === 'groq') {
      const ok = await this.groqProvider.isAvailable();
      if (ok) return { provider: this.groqProvider, fallbackUsed: false };
    }

    // Default or fallback to local
    return {
      provider: this.localProvider,
      fallbackUsed: target !== 'local',
    };
  }
}

const defaultProviderFactory = new ProviderFactory();

module.exports = {
  ProviderFactory,
  defaultProviderFactory,
};
