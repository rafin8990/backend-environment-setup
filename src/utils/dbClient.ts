import { Pool } from 'pg';
import config from '../config';
import { errorlogger, logger } from '../shared/logger';

const pool = new Pool({
  user: config.db.user,
  host: config.db.host,
  database: config.db.database,
  password: config.db.password,
  port: Number(config.db.port)||5432,
});

pool.on('connect', () => {
  logger.info('✅ Connected to PostgreSQL database');
});

type PoolErrorEventHandler = {
    (err: Error): void;
}

pool.on('error', ((err: Error) => {
    errorlogger.error('❌ Unexpected PostgreSQL error', err);
    process.exit(-1);
}) as PoolErrorEventHandler);

export default pool;
