import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();
// Also attempt to load from apps/api/.env if process started from root
dotenv.config({ path: path.resolve(process.cwd(), 'apps/api/.env') });

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => {
    const port = parseInt(val, 10);
    if (isNaN(port) || port <= 0 || port > 65535) {
      throw new Error(`Invalid PORT: ${val}`);
    }
    return port;
  }),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  APP_TIMEZONE: z.string().default('UTC'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  throw new Error('Environment configuration error');
}

export const env = parsed.data;

/**
 * Mask database credentials for safe logging
 */
export function getMaskedDatabaseUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.password) {
      parsedUrl.password = '****';
    }
    return parsedUrl.toString();
  } catch {
    return 'postgresql://[masked]';
  }
}

export default env;
