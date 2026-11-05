import pg from 'pg';
import { env, getMaskedDatabaseUrl } from '../config/env.js';

const { Pool } = pg;

const isProduction = env.NODE_ENV === 'production';
const requiresSsl = isProduction || env.DATABASE_URL.includes('sslmode=require') || env.DATABASE_URL.includes('.render.com');

const poolConfig: pg.PoolConfig = {
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

if (requiresSsl) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

export const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

export async function testConnection(): Promise<boolean> {
  let client;
  try {
    client = await pool.connect();
    const res = await client.query('SELECT NOW() as current_time, current_database() as db_name');
    console.log(`Connected to database [${res.rows[0].db_name}] at ${getMaskedDatabaseUrl(env.DATABASE_URL)}`);
    return true;
  } catch (error) {
    console.error(`Database connection failed: ${(error as Error).message}`);
    return false;
  } finally {
    if (client) client.release();
  }
}

export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (env.NODE_ENV === 'development') {
    // optional query debug
  }
  return res;
}

export async function closePool(): Promise<void> {
  await pool.end();
}

export default pool;
