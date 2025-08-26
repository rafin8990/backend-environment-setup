import { Server } from 'http';
import app from './app';
import config from './config';
import { errorlogger, logger } from './shared/logger';
import pool from './utils/dbClient';

async function bootstrap() {
  try {
    // Test database connection
    logger.info('🔍 Testing database connection...');
    const client = await pool.connect();
    logger.info('✅ Database connected successfully');
    client.release();
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    process.exit(1);
  }

  const server: Server = app.listen(config.port, () => {
    logger.info(`🚀 Server running on port ${config.port}`);
  });


  const exitHandler = () => {
    if (server) {
      server.close(() => {
        logger.info('Server closed');
      });
    }
    process.exit(1);
  };

  const unexpectedErrorHandler = (error: unknown) => {
    errorlogger.error(error);
    exitHandler();
  };

  process.on('uncaughtException', unexpectedErrorHandler);
  process.on('unhandledRejection', unexpectedErrorHandler);

  process.on('SIGTERM', () => {
    if (process.env.NODE_ENV !== 'production') {
      return;
    }
    logger.info('SIGTERM received');
    if (server) {
      server.close();
    }
  });
}

bootstrap();
