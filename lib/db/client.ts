/**
 * D1 database client wrapper
 * Provides helper functions for executing queries with error handling
 */

import { getD1Database } from '../cloudflare/bindings';

/**
 * Database error class for better error handling
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * Result type for database queries
 */
export interface QueryResult<T> {
  /** Query results */
  results: T[];
  /** Whether query was successful */
  success: boolean;
  /** Error if query failed */
  error?: string;
  /** Result metadata */
  meta?: {
    /** Number of rows affected */
    changes?: number;
    /** Last inserted row ID */
    last_row_id?: number;
    /** Number of rows returned */
    rows_read?: number;
    /** Number of rows written */
    rows_written?: number;
  };
}

/**
 * Gets the D1 database instance
 * Wrapper around getD1Database with error handling
 *
 * @returns D1 database instance
 * @throws DatabaseError if database is not available
 */
export function getDB(): D1Database {
  try {
    return getD1Database();
  } catch (error) {
    throw new DatabaseError(
      'Failed to get database connection',
      'DB_CONNECTION_ERROR',
      error
    );
  }
}

/**
 * Executes a D1 query and returns all results
 *
 * @param query - SQL query string
 * @param params - Query parameters (for prepared statements)
 * @returns Query results
 * @throws DatabaseError if query fails
 *
 * @example
 * ```typescript
 * const users = await queryD1<User>(
 *   "SELECT * FROM users WHERE email = ?",
 *   [email]
 * );
 * ```
 */
export async function queryD1<T = unknown>(
  query: string,
  params: unknown[] = []
): Promise<T[]> {
  try {
    const db = getDB();
    const stmt = db.prepare(query);
    const bound = params.length > 0 ? stmt.bind(...params) : stmt;
    const result = await bound.all<T>();

    if (!result.success) {
      throw new DatabaseError(
        `Query failed: ${result.error || 'Unknown error'}`,
        'QUERY_ERROR'
      );
    }

    return result.results || [];
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(
      `Failed to execute query: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'QUERY_EXECUTION_ERROR',
      error
    );
  }
}

/**
 * Executes a D1 query and returns the first result
 *
 * @param query - SQL query string
 * @param params - Query parameters (for prepared statements)
 * @returns First result or null if no results
 * @throws DatabaseError if query fails
 *
 * @example
 * ```typescript
 * const user = await queryFirstD1<User>(
 *   "SELECT * FROM users WHERE id = ?",
 *   [userId]
 * );
 * ```
 */
export async function queryFirstD1<T = unknown>(
  query: string,
  params: unknown[] = []
): Promise<T | null> {
  try {
    const db = getDB();
    const stmt = db.prepare(query);
    const bound = params.length > 0 ? stmt.bind(...params) : stmt;
    const result = await bound.first<T>();

    return result || null;
  } catch (error) {
    throw new DatabaseError(
      `Failed to execute query: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'QUERY_EXECUTION_ERROR',
      error
    );
  }
}

/**
 * Executes a D1 write query (INSERT, UPDATE, DELETE)
 *
 * @param query - SQL query string
 * @param params - Query parameters (for prepared statements)
 * @returns Execution metadata
 * @throws DatabaseError if query fails
 *
 * @example
 * ```typescript
 * const result = await executeD1(
 *   "INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)",
 *   [id, email, Date.now()]
 * );
 * console.log(`Inserted ${result.changes} rows`);
 * ```
 */
export async function executeD1(
  query: string,
  params: unknown[] = []
): Promise<{
  success: boolean;
  changes: number;
  last_row_id?: number;
}> {
  try {
    const db = getDB();
    const stmt = db.prepare(query);
    const bound = params.length > 0 ? stmt.bind(...params) : stmt;
    const result = await bound.run();

    if (!result.success) {
      throw new DatabaseError(
        `Execution failed: ${result.error || 'Unknown error'}`,
        'EXECUTION_ERROR'
      );
    }

    return {
      success: true,
      changes: result.meta.changes || 0,
      last_row_id: result.meta.last_row_id,
    };
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(
      `Failed to execute statement: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'EXECUTION_ERROR',
      error
    );
  }
}

/**
 * Executes multiple D1 queries in a batch
 * All queries must succeed or all will be rolled back
 *
 * @param queries - Array of query objects with query string and params
 * @returns Array of results for each query
 * @throws DatabaseError if any query fails
 *
 * @example
 * ```typescript
 * const results = await batchD1([
 *   { query: "INSERT INTO users (id, email) VALUES (?, ?)", params: [id1, email1] },
 *   { query: "INSERT INTO users (id, email) VALUES (?, ?)", params: [id2, email2] }
 * ]);
 * ```
 */
export async function batchD1(
  queries: Array<{ query: string; params?: unknown[] }>
): Promise<D1Result[]> {
  try {
    const db = getDB();
    const statements = queries.map(({ query, params = [] }) => {
      const stmt = db.prepare(query);
      return params.length > 0 ? stmt.bind(...params) : stmt;
    });

    const results = await db.batch(statements);
    return results;
  } catch (error) {
    throw new DatabaseError(
      `Failed to execute batch: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'BATCH_EXECUTION_ERROR',
      error
    );
  }
}

/**
 * Executes a query within a transaction
 * If callback throws, transaction is rolled back
 *
 * Note: D1 doesn't support explicit transactions yet, so this is a placeholder
 * for future implementation. Currently just executes the callback.
 *
 * @param callback - Function to execute within transaction
 * @returns Result of callback
 * @throws DatabaseError if callback throws
 */
export async function transactionD1<T>(
  callback: (db: D1Database) => Promise<T>
): Promise<T> {
  try {
    const db = getDB();
    return await callback(db);
  } catch (error) {
    throw new DatabaseError(
      `Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'TRANSACTION_ERROR',
      error
    );
  }
}

/**
 * Helper to build WHERE clause from filters
 *
 * @param filters - Object with filter key-value pairs
 * @param baseIndex - Starting index for parameters (default 1)
 * @returns Object with WHERE clause and parameter values
 *
 * @example
 * ```typescript
 * const { clause, params } = buildWhereClause({
 *   symbol: 'AAPL',
 *   transaction_type: 'BUY'
 * });
 * // clause: "WHERE symbol = ? AND transaction_type = ?"
 * // params: ['AAPL', 'BUY']
 * ```
 */
export function buildWhereClause(
  filters: Record<string, unknown>,
  baseIndex = 1
): { clause: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null) {
      conditions.push(`${key} = ?`);
      params.push(value);
    }
  }

  const clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { clause, params };
}

/**
 * Helper to sanitize table/column names (prevent SQL injection)
 *
 * @param name - Table or column name
 * @returns Sanitized name
 * @throws Error if name contains invalid characters
 */
export function sanitizeName(name: string): string {
  // Only allow alphanumeric, underscore, and dot
  if (!/^[a-zA-Z0-9_.]+$/.test(name)) {
    throw new Error(`Invalid table/column name: ${name}`);
  }
  return name;
}
