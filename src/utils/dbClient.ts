import { Pool } from 'pg';
import config from '../config';

const pool = new Pool({
  user: config.db.user,
  host: config.db.host,
  database: config.db.database,
  password: config.db.password,
  port: Number(config.db.port)||5432,
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

type PoolErrorEventHandler = {
    (err: Error): void;
}

pool.on('error', ((err: Error) => {
    console.error('❌ Unexpected PostgreSQL error', err);
    process.exit(-1);
}) as PoolErrorEventHandler);

export default pool;
