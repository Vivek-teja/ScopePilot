/**
 * AI Provider Factory & Manager
 *
 * Implements Review 4 multi-provider architecture:
 * - Abstracts local Ollama, Cloud Free APIs (Gemini, Groq), and Local Heuristic engine.
 * - Handles provider health checks, runtime switching, and automatic fallback.
 * - Per-user provider preferences: one user's selection does not mutate the global default.
 */

const { LocalModelProvider } = require('./localProvider');
const { OllamaModelProvider } = require('./ollamaProvider');
const { CloudModelProvider } = require('./cloudProvider');

const SUPPORTED_PROVIDERS = ['local', 'ollama', 'gemini', 'groq'];

class ProviderFactory {
  constructor() {
    this.localProvider = new LocalModelProvider();
    this.ollamaProvider = new OllamaModelProvider();
    this.geminiProvider = new CloudModelProvider('gemini');
    this.groqProvider = new CloudModelProvider('groq');

    this.activeProviderName = process.env.AI_PROVIDER || 'local';
    // Per-user provider preferences: userId (string) -> providerName
    this.userPreferences = new Map();
  }

  /**
   * Get list of all providers with their live availability status
   * @param {string} [userId] - Optional user ID to retrieve user-specific active provider
   */
  async getProvidersStatus(userId = null) {
    const [ollamaOk, geminiOk, groqOk] = await Promise.all([
      this.ollamaProvider.isAvailable(),
      this.geminiProvider.isAvailable(),
      this.groqProvider.isAvailable(),
    ]);

    const active = userId && this.userPreferences.has(userId.toString())
      ? this.userPreferences.get(userId.toString())
      : this.activeProviderName;

    return {
      activeProvider: active,
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
   * Switch the active provider. When userId is supplied, the selection is scoped to that
   * user so one user's choice does not mutate the server-wide default for other users.
   * @param {string} providerName - Supported provider name
   * @param {string} [userId] - User ID initiating the change
   */
  setActiveProvider(providerName, userId = null) {
    if (!SUPPORTED_PROVIDERS.includes(providerName)) {
      throw new Error(`Invalid provider "${providerName}". Supported: ${SUPPORTED_PROVIDERS.join(', ')}`);
    }
    if (userId) {
      this.userPreferences.set(userId.toString(), providerName);
      return providerName;
    }
    this.activeProviderName = providerName;
    return this.activeProviderName;
  }

  /**
   * Get active provider name for a user (or default server provider)
   * @param {string} [userId] - User ID
   */
  getUserProvider(userId = null) {
    if (userId && this.userPreferences.has(userId.toString())) {
      return this.userPreferences.get(userId.toString());
    }
    return this.activeProviderName;
  }

  /**
   * Resolve appropriate provider with automatic fallback protection
   * @param {string} [preferredName] - Preferred provider name
   * @param {string} [userId] - User ID for per-user preferences
   */
  async getProvider(preferredName, userId = null) {
    const target = preferredName || this.getUserProvider(userId);

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
  SUPPORTED_PROVIDERS,
};
