import { createApp } from './app.js';
import { env, getMaskedDatabaseUrl } from './config/env.js';
import { pool, testConnection } from './db/pool.js';

const app = createApp();

async function startServer() {
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.warn('⚠️ Warning: Database connection check failed on startup. Server will still attempt to listen.');
  }

  const server = app.listen(env.PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 FocusForge API running at http://localhost:${env.PORT}`);
    console.log(`📡 Environment: ${env.NODE_ENV}`);
    console.log(`🗄️ Database: ${getMaskedDatabaseUrl(env.DATABASE_URL)}`);
    console.log(`🌐 Allowed Origin: ${env.CLIENT_ORIGIN}`);
    console.log(`===============================================`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      console.log('HTTP server closed.');
      try {
        await pool.end();
        console.log('Database connections closed.');
      } catch (err) {
        console.error('Error closing database pool:', err);
      }
      process.exit(0);
    });

    // Force shutdown after timeout
    setTimeout(() => {
      console.error('Forced shutdown after timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
