const { CloudModelProvider } = require('../src/ai/providers/cloudProvider');
const { OllamaModelProvider } = require('../src/ai/providers/ollamaProvider');

describe('AI Model Providers Unit Tests (Mocked Adapters)', () => {
  const originalFetch = globalThis.fetch;
  const mockContext = {
    newClientRequest: {
      title: 'Add PayPal checkout',
      description: 'Support payment with PayPal',
    },
    retrievedPassages: [
      {
        sourceReference: 'DEL-PAY-01',
        sourceTitle: 'Stripe Payment Gateway',
        passageText: 'Credit card payment via Stripe integration.',
      },
    ],
    approvedProposalVersion: {
      title: 'E-commerce Platform',
      scopeSummary: 'Standard online store',
    },
    deliverables: [
      {
        id: 'del-1',
        scopeReference: 'DEL-PAY-01',
        title: 'Stripe Payment Gateway',
      },
    ],
  };

  const validComparisonResponse = {
    summary: 'PayPal is out of scope for the current Stripe milestone.',
    reviewStatus: 'out_of_scope',
    confidenceScore: 0.95,
    inScopeItems: [],
    outOfScopeItems: [
      {
        item: 'Add PayPal checkout',
        reason: 'Proposal baseline only specifies Stripe.',
        potentialImpact: 'Requires additional PayPal SDK integration.',
      },
    ],
    uncertainItems: [],
    affectedDeliverables: [
      {
        deliverableId: 'del-1',
        scopeReference: 'DEL-PAY-01',
        title: 'Stripe Payment Gateway',
        impactDescription: 'Alternative gateway integration.',
      },
    ],
    suggestedQuestions: ['Should PayPal be scheduled for a Phase 2 amendment?'],
  };

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  // ΓöÇΓöÇ 1. Google Gemini Provider Tests ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  describe('CloudModelProvider (Gemini)', () => {
    const geminiKey = 'test-gemini-secret-api-key-12345';

    it('reports availability based on presence of API key', async () => {
      const withKey = new CloudModelProvider('gemini', { apiKey: geminiKey });
      expect(await withKey.isAvailable()).toBe(true);

      const withoutKey = new CloudModelProvider('gemini', { apiKey: '' });
      expect(await withoutKey.isAvailable()).toBe(false);
    });

    it('throws error immediately without making network calls when API key is missing', async () => {
      const provider = new CloudModelProvider('gemini', { apiKey: '' });
      await expect(provider.generateComparison(mockContext)).rejects.toThrow(
        'API Key for gemini is not configured'
      );
    });

    it('transmits API key via x-goog-api-key header and NOT in the URL query string', async () => {
      let capturedUrl = null;
      let capturedHeaders = null;

      globalThis.fetch = jest.fn(async (url, options) => {
        capturedUrl = url;
        capturedHeaders = options.headers;
        return {
          ok: true,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [{ text: JSON.stringify(validComparisonResponse) }],
                },
              },
            ],
          }),
        };
      });

      const provider = new CloudModelProvider('gemini', { apiKey: geminiKey });
      const result = await provider.generateComparison(mockContext);

      expect(capturedUrl).not.toContain(geminiKey);
      expect(capturedUrl).not.toContain('?key=');
      expect(capturedHeaders['x-goog-api-key']).toBe(geminiKey);
      expect(result.reviewStatus).toBe('out_of_scope');
    });

    it('handles HTTP error responses safely without leaking API key', async () => {
      globalThis.fetch = jest.fn(async () => ({
        ok: false,
        status: 403,
      }));

      const provider = new CloudModelProvider('gemini', { apiKey: geminiKey });
      await expect(provider.generateComparison(mockContext)).rejects.toThrow(
        'Gemini request failed: Gemini API Error: 403'
      );
    });

    it('handles malformed JSON response safely', async () => {
      globalThis.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'This is not JSON at all' }],
              },
            },
          ],
        }),
      }));

      const provider = new CloudModelProvider('gemini', { apiKey: geminiKey });
      await expect(provider.generateComparison(mockContext)).rejects.toThrow(
        /Gemini request failed: Unexpected token/i
      );
    });

    it('handles missing candidate parts safely', async () => {
      globalThis.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({
          candidates: [],
        }),
      }));

      const provider = new CloudModelProvider('gemini', { apiKey: geminiKey });
      await expect(provider.generateComparison(mockContext)).rejects.toThrow(
        'Gemini request failed: Gemini response contained no candidate text parts'
      );
    });

    it('redacts credentials if an exception message happens to contain the API key', async () => {
      globalThis.fetch = jest.fn(async () => {
        throw new Error(`Failed to authenticate with key: ${geminiKey}`);
      });

      const provider = new CloudModelProvider('gemini', { apiKey: geminiKey });
      try {
        await provider.generateComparison(mockContext);
        throw new Error('Expected generateComparison to throw');
      } catch (err) {
        expect(err.message).not.toContain(geminiKey);
        expect(err.message).toContain('[REDACTED]');
      }
    });

    it('handles network connection abort / timeout', async () => {
      globalThis.fetch = jest.fn(async () => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        throw error;
      });

      const provider = new CloudModelProvider('gemini', { apiKey: geminiKey });
      await expect(provider.generateComparison(mockContext)).rejects.toThrow(
        /Gemini request failed: The operation was aborted/i
      );
    });

    it('aborts when Gemini response headers arrive but response body consumption stalls', async () => {
      globalThis.fetch = jest.fn(async (_url, options) => {
        return {
          ok: true,
          json: () =>
            new Promise((_, reject) => {
              if (options.signal) {
                options.signal.addEventListener('abort', () => {
                  const error = new Error('The operation was aborted');
                  error.name = 'AbortError';
                  reject(error);
                });
              }
            }),
        };
      });

      const provider = new CloudModelProvider('gemini', { apiKey: geminiKey, timeoutMs: 50 });
      await expect(provider.generateComparison(mockContext)).rejects.toThrow(
        /Gemini request failed: The operation was aborted/i
      );
    });
  });

  // ΓöÇΓöÇ 2. Groq Cloud Provider Tests ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  describe('CloudModelProvider (Groq)', () => {
    const groqKey = 'gsk_test_groq_secret_api_key_67890';

    it('reports availability based on presence of API key', async () => {
      const withKey = new CloudModelProvider('groq', { apiKey: groqKey });
      expect(await withKey.isAvailable()).toBe(true);

      const withoutKey = new CloudModelProvider('groq', { apiKey: '' });
      expect(await withoutKey.isAvailable()).toBe(false);
    });

    it('transmits API key via Authorization Bearer header', async () => {
      let capturedHeaders = null;

      globalThis.fetch = jest.fn(async (_url, options) => {
        capturedHeaders = options.headers;
        return {
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify(validComparisonResponse),
                },
              },
            ],
          }),
        };
      });

      const provider = new CloudModelProvider('groq', { apiKey: groqKey });
      const result = await provider.generateComparison(mockContext);

      expect(capturedHeaders.Authorization).toBe(`Bearer ${groqKey}`);
      expect(result.reviewStatus).toBe('out_of_scope');
    });

    it('handles HTTP error responses (e.g. 429 rate limit)', async () => {
      globalThis.fetch = jest.fn(async () => ({
        ok: false,
        status: 429,
      }));

      const provider = new CloudModelProvider('groq', { apiKey: groqKey });
      await expect(provider.generateComparison(mockContext)).rejects.toThrow(
        'Groq request failed: Groq API Error: 429'
      );
    });

    it('handles missing message content', async () => {
      globalThis.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({
          choices: [],
        }),
      }));

      const provider = new CloudModelProvider('groq', { apiKey: groqKey });
      await expect(provider.generateComparison(mockContext)).rejects.toThrow(
        'Groq request failed: Groq response contained no message content'
      );
    });

    it('redacts credentials if Groq error message contains the API key', async () => {
      globalThis.fetch = jest.fn(async () => {
        throw new Error(`Unauthorized access with bearer token ${groqKey}`);
      });

      const provider = new CloudModelProvider('groq', { apiKey: groqKey });
      try {
        await provider.generateComparison(mockContext);
        throw new Error('Expected generateComparison to throw');
      } catch (err) {
        expect(err.message).not.toContain(groqKey);
        expect(err.message).toContain('[REDACTED]');
      }
    });

    it('aborts when Groq response headers arrive but response body consumption stalls', async () => {
      globalThis.fetch = jest.fn(async (_url, options) => {
        return {
          ok: true,
          json: () =>
            new Promise((_, reject) => {
              if (options.signal) {
                options.signal.addEventListener('abort', () => {
                  const error = new Error('The operation was aborted');
                  error.name = 'AbortError';
                  reject(error);
                });
              }
            }),
        };
      });

      const provider = new CloudModelProvider('groq', { apiKey: groqKey, timeoutMs: 50 });
      await expect(provider.generateComparison(mockContext)).rejects.toThrow(
        /Groq request failed: The operation was aborted/i
      );
    });
  });

  // ΓöÇΓöÇ 3. Ollama Local Daemon Provider Tests ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  describe('OllamaModelProvider', () => {
    it('isAvailable returns true when local /api/tags responds with 200', async () => {
      globalThis.fetch = jest.fn(async (url) => {
        if (url.includes('/api/tags')) {
          return { ok: true };
        }
        return { ok: false };
      });

      const provider = new OllamaModelProvider();
      expect(await provider.isAvailable()).toBe(true);
    });

    it('isAvailable returns false when local Ollama is offline or times out', async () => {
      globalThis.fetch = jest.fn(async () => {
        throw new Error('connect ECONNREFUSED 127.0.0.1:11434');
      });

      const provider = new OllamaModelProvider();
      expect(await provider.isAvailable()).toBe(false);
    });

    it('successfully parses valid JSON response from Ollama daemon', async () => {
      globalThis.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({
          response: JSON.stringify(validComparisonResponse),
        }),
      }));

      const provider = new OllamaModelProvider();
      const result = await provider.generateComparison(mockContext);
      expect(result.reviewStatus).toBe('out_of_scope');
      expect(result.confidenceScore).toBe(0.95);
    });

    it('handles Ollama HTTP error response', async () => {
      globalThis.fetch = jest.fn(async () => ({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      }));

      const provider = new OllamaModelProvider();
      await expect(provider.generateComparison(mockContext)).rejects.toThrow(
        'Ollama execution failed: Ollama HTTP Error: 500 Internal Server Error'
      );
    });

    it('handles malformed string in json.response safely', async () => {
      globalThis.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({
          response: 'not valid json',
        }),
      }));

      const provider = new OllamaModelProvider();
      await expect(provider.generateComparison(mockContext)).rejects.toThrow(
        /Ollama execution failed: Unexpected token/i
      );
    });

    it('handles missing response string property safely', async () => {
      globalThis.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({}),
      }));

      const provider = new OllamaModelProvider();
      await expect(provider.generateComparison(mockContext)).rejects.toThrow(
        'Ollama execution failed: Ollama response did not contain a valid response string'
      );
    });

    it('aborts when Ollama response headers arrive but response body consumption stalls', async () => {
      globalThis.fetch = jest.fn(async (_url, options) => {
        return {
          ok: true,
          json: () =>
            new Promise((_, reject) => {
              if (options.signal) {
                options.signal.addEventListener('abort', () => {
                  const error = new Error('The operation was aborted');
                  error.name = 'AbortError';
                  reject(error);
                });
              }
            }),
        };
      });

      const provider = new OllamaModelProvider();
      provider.timeoutMs = 50;
      await expect(provider.generateComparison(mockContext)).rejects.toThrow(
        /Ollama execution failed: The operation was aborted/i
      );
    });
  });
});
