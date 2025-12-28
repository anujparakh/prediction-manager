/**
 * Cloudflare bindings helpers for Next.js with OpenNext
 * Provides type-safe access to Cloudflare D1 database
 */

/// <reference types="@cloudflare/workers-types" />

/**
 * Cloudflare environment bindings
 */
export interface CloudflareEnv {
  /** D1 database binding */
  DB: D1Database;
}

/**
 * Gets the D1 database instance from Cloudflare context
 *
 * @returns D1 database instance
 * @throws Error if database binding is not available
 *
 * @example
 * ```typescript
 * const db = getD1Database();
 * const result = await db.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
 * ```
 */
export function getD1Database(): D1Database {
  try {
    // Access bindings through OpenNext's cloudflare context (symbol-based)
    const context = (globalThis as any)[Symbol.for('__cloudflare-context__')];
    const env = context?.env as CloudflareEnv | undefined;

    if (!env?.DB) {
      throw new Error('D1 database binding not found. Make sure DB is configured in wrangler.toml');
    }

    return env.DB;
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      throw new Error('D1 database binding not found. Make sure DB is configured in wrangler.toml');
    }
    throw error;
  }
}

/**
 * Checks if the app is running in Cloudflare environment
 *
 * @returns true if running in Cloudflare, false otherwise
 */
export function isCloudflareEnvironment(): boolean {
  return typeof (globalThis as any)[Symbol.for('__cloudflare-context__')] !== 'undefined';
}

/**
 * Gets the Cloudflare environment object
 *
 * @returns Cloudflare environment with all bindings
 * @throws Error if not running in Cloudflare environment
 */
export function getCloudflareEnv(): CloudflareEnv {
  const context = (globalThis as any)[Symbol.for('__cloudflare-context__')];
  const env = context?.env as CloudflareEnv | undefined;

  if (!env) {
    throw new Error('Cloudflare environment not available. Make sure you are running in Cloudflare Workers.');
  }

  return env;
}
