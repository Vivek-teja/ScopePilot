const dotenv = require('dotenv');
const { z } = require('zod');
const path = require('path');

// Load .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PREFIX: z.string().default('/api'),
  MONGODB_URI: z
    .string()
    .default('mongodb://localhost:27017/scopepilot_dev'),
  JWT_SECRET: z
    .string()
    .min(16, 'JWT_SECRET must be at least 16 characters long')
    .default('default_development_jwt_secret_key_minimum_32_characters_long'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('*'),
  AI_PROVIDER: z.string().default('local'),
  OLLAMA_BASE_URL: z.string().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('llama3.2'),
  // Optional: Ollama host used by the embedding service (separate from the inference base URL).
  // Leave unset to use the TF.js local embedding fallback (no Ollama required).
  OLLAMA_HOST: z.string().optional(),
  // Ollama embedding model name (used only when OLLAMA_HOST is set)
  OLLAMA_EMBED_MODEL: z.string().default('nomic-embed-text'),
  // Free-tier cloud provider API keys (leave empty to use local provider)
  GEMINI_API_KEY: z.string().default(''),
  // Gemini model name — verify at https://ai.google.dev/gemini-api/docs/models
  GEMINI_MODEL: z.string().default('gemini-1.5-flash'),
  GROQ_API_KEY: z.string().default(''),
  // Groq model name — verify at https://console.groq.com/docs/models
  GROQ_MODEL: z.string().default('llama-3.1-8b-instant'),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables configuration:');
    console.error(JSON.stringify(result.error.format(), null, 2));
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }

  return result.success ? result.data : envSchema.parse({});
};

const env = parseEnv();

module.exports = env;
