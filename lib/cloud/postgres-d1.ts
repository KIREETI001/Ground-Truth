import { Pool, types } from 'pg';

// The application owns authorization. Tables live in a non-exposed schema and
// are never queried with browser keys. This compatibility layer retains the
// tested D1 query/transaction contract while using Supabase PostgreSQL.
export interface QueryResult { rows: Record<string, unknown>[]; rowCount: number | null; command?: string }
export interface QueryClient {
  query(sql: string, values?: unknown[]): Promise<QueryResult>;
  release(): void;
}
export interface QueryPool { connect(): Promise<QueryClient> }

const numberParser = (value: string) => {
  const result = Number(value);
  if (!Number.isSafeInteger(result)) throw new Error('Database integer exceeds the supported range.');
  return result;
};
const pgTypes = { getTypeParser: (oid: number, format?: string) => oid === 20
  ? numberParser : types.getTypeParser(oid, format as 'text' | undefined) };

/** Translate only the SQLite dialect used by reviewed application queries. */
export function translateSql(input: string): { sql: string; bindings: number[] } {
  let sql = input.trim().replace(/;\s*$/, '');
  const ignore = /^INSERT OR IGNORE\b/i.test(sql);
  sql = sql.replace(/^INSERT OR IGNORE\b/i, 'INSERT');
  // SQLite resolves unqualified upsert RHS names to the target table. Postgres
  // also sees EXCLUDED there and requires qualification. Assignment LHS names
  // and quoted strings must remain untouched.
  const insert = /^INSERT INTO\s+(\w+)\s*\(([^)]+)\)/i.exec(sql);
  const update = /\bDO UPDATE SET\b/i.exec(sql);
  if (insert && update) {
    const columns = new Set(insert[2].split(',').map(value => value.trim()));
    const offset = update.index + update[0].length;
    const returning = sql.slice(offset).search(/\bRETURNING\b/i);
    const end = returning < 0 ? sql.length : offset + returning;
    const assignments = sql.slice(offset, end);
    const qualified = assignments.replace(/'(?:''|[^'])*'|"(?:""|[^"])*"|\b[a-z_][a-z0-9_]*\b/gi,
      (token, index: number) => {
        if (!columns.has(token) || assignments[index - 1] === '.' || /^\s*=(?!=)/.test(assignments.slice(index + token.length))) return token;
        return `${insert[1]}.${token}`;
      });
    sql = sql.slice(0, offset) + qualified + sql.slice(end);
  }
  sql = sql.replace(/strftime\('%Y-%m-%dT%H:%M:%fZ','now'\)/gi,
    `to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`);
  sql = sql.replace(/json_extract\(([\w.]+),'\$\.([\w.]+)'\)/gi,
    (_match, column: string, path: string) => `(${column}::jsonb #>> '{${path.split('.').join(',')}}')`);
  sql = sql.replace(/json_array_length\(([\w.?]+),'\$\.([\w]+)'\)/gi,
    (_match, column: string, key: string) => `jsonb_array_length(${column}::jsonb->'${key}')`);
  sql = sql.replace(/json_each\((\?\d+)\) AS prerequisite/gi,
    'jsonb_array_elements_text($1::jsonb) AS prerequisite(value)');
  // The one nullable numbered bind in the lab is a text idempotency key.
  // PostgreSQL cannot infer the type at its first IS NULL occurrence.
  sql = sql.replace(/(\?\d+)\s+IS NULL\b/gi, '$1::text IS NULL');
  sql = sql.replace(/json_object\('previousStatus',status\)/gi,
    `json_build_object('previousStatus',status)::text`);
  // SQLite retains alias case; PostgreSQL folds it unless quoted.
  sql = sql.replace(/\bAS\s+([a-z_][a-zA-Z0-9_]*[A-Z][a-zA-Z0-9_]*)\b/g,
    (_match, alias: string) => `AS "${alias}"`);
  if (ignore && !/\bON CONFLICT\b/i.test(sql)) {
    const returning = sql.search(/\bRETURNING\b/i);
    sql = returning < 0 ? `${sql} ON CONFLICT DO NOTHING`
      : `${sql.slice(0, returning)}ON CONFLICT DO NOTHING ${sql.slice(returning)}`;
  }

  // Bind values stay values. Do not replace '?' inside SQL strings, quoted
  // identifiers or comments. Numbered SQLite parameters may repeat/out of order.
  const bindings: number[] = [];
  const postgresIndexes = new Map<number, number>();
  let nextSqliteIndex = 1;
  const parts = sql.match(/'(?:''|[^'])*'|"(?:""|[^"])*"|--[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/|\?\d*|[^'"?/-]+|[\s\S]/g) ?? [];
  sql = parts.map(part => {
    if (!/^\?\d*$/.test(part)) return part;
    const sqliteIndex = part.length > 1 ? Number(part.slice(1)) : nextSqliteIndex;
    if (sqliteIndex < 1 || !Number.isSafeInteger(sqliteIndex)) throw new Error('Invalid SQL bind parameter.');
    nextSqliteIndex = Math.max(nextSqliteIndex, sqliteIndex + 1);
    let postgresIndex = postgresIndexes.get(sqliteIndex);
    if (!postgresIndex) {
      bindings.push(sqliteIndex - 1);
      postgresIndex = bindings.length;
      postgresIndexes.set(sqliteIndex, postgresIndex);
    }
    return `$${postgresIndex}`;
  }).join('');
  return { sql, bindings };
}

class PostgresStatement {
  readonly database: PostgresD1;
  readonly sql: string;
  readonly values: unknown[];
  constructor(database: PostgresD1, sql: string, values: unknown[] = []) {
    this.database = database; this.sql = sql; this.values = values;
  }
  bind(...values: unknown[]) { return new PostgresStatement(this.database, this.sql, values); }
  async execute<T>(client: QueryClient): Promise<D1Result<T>> {
    const query = translateSql(this.sql);
    const values = query.bindings.map(index => {
      if (index >= this.values.length || this.values[index] === undefined) throw new Error('Missing SQL bind value.');
      return this.values[index];
    });
    const result = await client.query(query.sql, values);
    const changes = /^(INSERT|UPDATE|DELETE)$/i.test(result.command ?? '') ? result.rowCount ?? 0 : 0;
    return { success: true, results: result.rows as T[], meta: {
      changes, last_row_id: 0, duration: 0, size_after: 0,
      rows_read: result.rows.length, rows_written: changes, changed_db: changes > 0,
    } };
  }
  async all<T>() { return this.database.execute<T>([this]).then(results => results[0]); }
  async run<T>() { return this.all<T>(); }
  async first<T>(columnName?: string): Promise<T | null> {
    const result = await this.all<Record<string, unknown>>();
    const row = result.results[0];
    return row ? (columnName ? row[columnName] : row) as T : null;
  }
  async raw<T>(options?: { columnNames?: boolean }): Promise<T[]> {
    const result = await this.all<Record<string, unknown>>();
    const rows = result.results.map(row => Object.values(row));
    return (options?.columnNames && result.results[0]
      ? [Object.keys(result.results[0]), ...rows] : rows) as T[];
  }
}

export class PostgresD1 {
  readonly db: D1Database;
  readonly pool: QueryPool;
  constructor(pool: QueryPool) { this.pool = pool; this.db = this as unknown as D1Database; }
  prepare(sql: string) { return new PostgresStatement(this, sql); }
  batch<T = unknown>(statements: PostgresStatement[]) { return this.execute<T>(statements); }
  async execute<T>(statements: PostgresStatement[]): Promise<D1Result<T>[]> {
    if (statements.some(statement => statement.database !== this)) throw new Error('Cannot mix database statements.');
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // SET LOCAL is transaction-safe on Supavisor. No session state or named
      // prepared statements leak across serverless requests.
      await client.query('SET LOCAL search_path TO groundtruth, pg_catalog');
      await client.query("SET LOCAL statement_timeout = '15s'");
      if (statements.some(statement => !/^\s*SELECT\b/i.test(statement.sql))) {
        // SQLite's guarded writes serialize. Retain that property for quotas,
        // immutable submissions and linked updates across multiple Vercel nodes.
        await client.query('SELECT pg_advisory_xact_lock(1796895316)');
      }
      const result: D1Result<T>[] = [];
      for (const statement of statements) result.push(await statement.execute<T>(client));
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally { client.release(); }
  }
}

const pools = new Map<string, PostgresD1>();
export function createPostgresDatabase(connectionString: string, caCertificate = process.env.SUPABASE_CA_CERT): D1Database {
  const cacheKey = connectionString + '\n' + (caCertificate ?? '');
  const existing = pools.get(cacheKey);
  if (existing) return existing.db;
  const url = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('DATABASE_URL must be a PostgreSQL URL.');
  // A managed Supabase endpoint must verify TLS. Never silently disable it.
  for (const option of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(option);
  const pool = new Pool({ connectionString: url.toString(), max: 2, idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 10_000, allowExitOnIdle: true, types: pgTypes,
    ssl: { rejectUnauthorized: true, ...(caCertificate ? { ca: caCertificate.replace(/\\n/g, '\n') } : {}) }, application_name: 'groundtruth-vercel' });
  pool.on('error', () => { /* Request failures surface without printing credentials. */ });
  const adapter = new PostgresD1(pool as unknown as QueryPool);
  pools.set(cacheKey, adapter);
  return adapter.db;
}
