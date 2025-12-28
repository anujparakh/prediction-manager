/**
 * Database query layer - Main entry point
 *
 * This module provides a complete database abstraction layer for the prediction manager app.
 * It includes all database operations for users, transactions, rules, and recommendations.
 *
 * @module lib/db
 */

// Export all types and interfaces
export * from './schema';

// Export database client utilities
export * from './client';

// Export all query functions
export * from './queries/portfolio';
export * from './queries/transactions';
export * from './queries/rules';
export * from './queries/recommendations';

// Export Cloudflare bindings
export * from '../cloudflare/bindings';
