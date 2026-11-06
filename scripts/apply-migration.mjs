import pg from 'pg';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
function getEnvVal(key) {
  const m = envContent.match(new RegExp(key + '=(.*)'));
  return m ? m[1].trim() : '';
}

const dbUrl = getEnvVal('DIRECT_URL') || getEnvVal('DATABASE_URL') || getEnvVal('POSTGRES_URL');
if (!dbUrl) {
  console.error('No database connection URL found in .env');
  process.exit(1);
}

const sql = fs.readFileSync('supabase/migrations/20261106000000_m2_initial_schema.sql', 'utf-8');

async function apply() {
  console.log('Connecting to Postgres...');
  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();
  console.log('Applying 20261106000000_m2_initial_schema.sql...');
  
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Migration applied successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

apply();

