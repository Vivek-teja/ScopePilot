const http = require('http');

/**
 * Common English stopwords to down-weight during vectorization.
 */
const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'were', 'will', 'with', 'the', 'this', 'but', 'they',
  'have', 'had', 'what', 'when', 'where', 'who', 'which', 'why', 'how',
]);

/**
 * Domain semantic synonym clusters to bridge vocabulary mismatches between
 * informal client phrasing and formal contractual deliverable descriptions.
 */
const SEMANTIC_CLUSTERS = {
  // Telephony & Contact Validation
  phone: ['phone', 'telephone', 'cellphone', 'mobile', 'dial', 'dialcode', 'e164', 'contact', 'digits'],
  validation: ['validation', 'validate', 'formatting', 'format', 'check', 'picker', 'sanitization'],
  
  // Checkout & Commerce Flow
  checkout: ['checkout', 'buy', 'buying', 'purchase', 'purchasing', 'cart', 'basket', 'screen', 'flow', 'billing'],
  payment: ['payment', 'pay', 'stripe', 'credit', 'card', 'gateway', 'charge', 'receipt', 'currency', 'wallet'],
  
  // Catalog & Product Browsing
  catalog: ['catalog', 'catalogue', 'products', 'goods', 'items', 'articles', 'inventory', 'listing', 'merchandise'],
  filter: ['filter', 'filtering', 'faceted', 'bracket', 'criteria', 'sort', 'sorting', 'refine', 'search', 'query'],
  
  // Communication & Notifications
  messaging: ['notification', 'notifications', 'notify', 'alert', 'alerts', 'dispatch'],
  email: ['email', 'mail', 'smtp', 'sendgrid', 'inbox'],
  sms: ['sms', 'push', 'mms', 'cellular', 'textmessage'],
  
  // Enterprise & Legacy Infrastructure
  erp: ['erp', 'sap', 'enterprise', 'oracle', 'netsuite', 'dynamics'],
  connector: ['connector', 'tunnel', 'bridge', 'sync', 'adapter', 'vpn', 'mainframe', 'as400', 'proprietary', 'warehouse'],
  
  // Blockchain / Web3 Distractors
  crypto: ['crypto', 'cryptocurrency', 'web3', 'metamask', 'wallet', 'token', 'tokens', 'ethereum', 'solana', 'blockchain', 'defi'],
  
  // Authentication & Security
  auth: ['auth', 'authentication', 'login', 'signup', 'password', 'jwt', 'session', 'role'],
};

const VECTOR_DIMENSIONS = 1024;

class EmbeddingService {
  constructor(options = {}) {
    this.dimensions = options.dimensions || VECTOR_DIMENSIONS;
    this.ollamaHost = options.ollamaHost || process.env.OLLAMA_HOST || null;
    this.ollamaModel = options.ollamaModel || process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';
  }

  /**
   * Tokenizes, normalizes, and stems words.
   * @param {string} text 
   * @returns {string[]}
   */
  tokenize(text) {
    if (!text || typeof text !== 'string') return [];
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/[\s-]+/)
      .filter((t) => t.length > 1 && !STOPWORDS.has(t));
  }

  /**
   * Fast Fowler-Noll-Vo (FNV-1a) 32-bit hash function mapped into vector space.
   * @param {string} str 
   * @returns {number}
   */
  hashString(str) {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = (hash * 16777619) >>> 0;
    }
    return hash % this.dimensions;
  }

  /**
   * Generates character n-grams to capture subword morphological similarities.
   * @param {string} word 
   * @returns {string[]}
   */
  getCharacterNgrams(word, n = 3) {
    if (word.length < n) return [word];
    const ngrams = [];
    for (let i = 0; i <= word.length - n; i++) {
      ngrams.push(word.substring(i, i + n));
    }
    return ngrams;
  }

  /**
   * Computes a normalized dense vector embedding for arbitrary text.
   * Employs TF-IDF sublinear scaling and character n-gram hashing with semantic cluster weighting.
   * 
   * @param {string} text 
   * @returns {Float32Array} L2-normalized dense vector
   */
  embedText(text) {
    const vector = new Float32Array(this.dimensions);
    const tokens = this.tokenize(text);
    if (tokens.length === 0) {
      return vector;
    }

    const termFrequency = new Map();
    for (const token of tokens) {
      termFrequency.set(token, (termFrequency.get(token) || 0) + 1);
    }

    // 1. Project tokens and character n-grams into vector dimensions
    for (const [token, count] of termFrequency.entries()) {
      const weight = 1 + Math.log(count);
      const tokenDim = this.hashString(token);
      vector[tokenDim] += weight * 2.0;

      const ngrams = this.getCharacterNgrams(token, 3);
      for (const ngram of ngrams) {
        const ngramDim = this.hashString(`ng_${ngram}`);
        vector[ngramDim] += weight * 0.5;
      }
    }

    // 2. Project semantic concept clusters to bridge vocabulary differences
    for (const token of tokens) {
      for (const [canonical, cluster] of Object.entries(SEMANTIC_CLUSTERS)) {
        if (cluster.includes(token)) {
          const conceptDim = this.hashString(`concept_${canonical}`);
          vector[conceptDim] += 5.0;
          for (const synonym of cluster) {
            const synDim = this.hashString(`syn_${synonym}`);
            vector[synDim] += 1.2;
          }
          break;
        }
      }
    }

    // 3. L2 Normalization: ||v|| = 1
    let sumOfSquares = 0;
    for (let i = 0; i < this.dimensions; i++) {
      sumOfSquares += vector[i] * vector[i];
    }

    const norm = Math.sqrt(sumOfSquares);
    if (norm > 0) {
      for (let i = 0; i < this.dimensions; i++) {
        vector[i] /= norm;
      }
    }

    return vector;
  }

  /**
   * Computes the cosine similarity between two normalized embedding vectors.
   * Since vectors are unit-length (L2-normalized), similarity is their dot product.
   * Clamped to [0.0, 1.0].
   * 
   * @param {Float32Array|number[]} vecA 
   * @param {Float32Array|number[]} vecB 
   * @returns {number} Similarity score between 0.0 and 1.0
   */
  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0.0;
    let dotProduct = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
    }
    const clamped = Math.max(0.0, Math.min(1.0, dotProduct));
    return Number(clamped.toFixed(4));
  }

  /**
   * Asynchronous embed method with optional Ollama adapter fallback.
   * Guaranteed to succeed locally even when Ollama is unavailable.
   * 
   * @param {string} text 
   * @returns {Promise<Float32Array>}
   */
  async embed(text) {
    if (this.ollamaHost) {
      try {
        const ollamaVector = await this.embedWithOllama(text);
        if (ollamaVector && ollamaVector.length > 0) {
          return ollamaVector;
        }
      } catch {
        // Fall back to local vectorizer
      }
    }
    return this.embedText(text);
  }

  /**
   * Optional helper to fetch embeddings from local Ollama if active.
   */
  embedWithOllama(text) {
    return new Promise((resolve, reject) => {
      const url = new URL(this.ollamaHost);
      const postData = JSON.stringify({
        model: this.ollamaModel,
        prompt: text,
      });

      const req = http.request(
        {
          hostname: url.hostname,
          port: url.port || 11434,
          path: '/api/embeddings',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
          },
          timeout: 1000,
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            if (res.statusCode === 200) {
              try {
                const parsed = JSON.parse(body);
                if (Array.isArray(parsed.embedding)) {
                  resolve(new Float32Array(parsed.embedding));
                  return;
                }
              } catch (e) {
                reject(e);
              }
            }
            reject(new Error(`Ollama returned status ${res.statusCode}`));
          });
        }
      );

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Ollama request timed out'));
      });

      req.write(postData);
      req.end();
    });
  }
}

const defaultEmbeddingService = new EmbeddingService();

module.exports = {
  EmbeddingService,
  defaultEmbeddingService,
  SEMANTIC_CLUSTERS,
};
