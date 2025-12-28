/**
 * Transaction queries - manage buy/sell transactions
 */

import { v4 as uuidv4 } from 'uuid';
import { queryD1, queryFirstD1, executeD1, DatabaseError } from '../client';
import type {
  Transaction,
  CreateTransactionInput,
  TransactionFilters,
} from '../schema';

/**
 * Gets all transactions for a user with optional filters
 *
 * @param userId - User ID
 * @param filters - Optional filters for transactions
 * @returns Array of transactions matching filters
 * @throws DatabaseError if query fails
 *
 * @example
 * ```typescript
 * // Get all transactions
 * const all = await getTransactions(userId);
 *
 * // Get only BUY transactions for AAPL
 * const filtered = await getTransactions(userId, {
 *   symbol: 'AAPL',
 *   transaction_type: 'BUY',
 *   limit: 10
 * });
 * ```
 */
export async function getTransactions(
  userId: string,
  filters?: TransactionFilters
): Promise<Transaction[]> {
  try {
    const params: unknown[] = [userId];
    const conditions: string[] = ['user_id = ?'];

    // Build WHERE clause from filters
    if (filters) {
      if (filters.symbol) {
        conditions.push('symbol = ?');
        params.push(filters.symbol);
      }

      if (filters.transaction_type) {
        conditions.push('transaction_type = ?');
        params.push(filters.transaction_type);
      }

      if (filters.start_date) {
        conditions.push('transaction_date >= ?');
        params.push(filters.start_date);
      }

      if (filters.end_date) {
        conditions.push('transaction_date <= ?');
        params.push(filters.end_date);
      }
    }

    const whereClause = conditions.join(' AND ');

    // Build ORDER BY and LIMIT clauses
    let query = `
      SELECT * FROM transactions
      WHERE ${whereClause}
      ORDER BY transaction_date DESC
    `;

    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters?.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }

    return await queryD1<Transaction>(query, params);
  } catch (error) {
    throw new DatabaseError(
      `Failed to get transactions: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'GET_TRANSACTIONS_ERROR',
      error
    );
  }
}

/**
 * Gets a single transaction by ID
 *
 * @param transactionId - Transaction ID
 * @param userId - User ID (for security check)
 * @returns Transaction or null if not found or doesn't belong to user
 * @throws DatabaseError if query fails
 */
export async function getTransactionById(
  transactionId: string,
  userId: string
): Promise<Transaction | null> {
  try {
    return await queryFirstD1<Transaction>(
      'SELECT * FROM transactions WHERE id = ? AND user_id = ?',
      [transactionId, userId]
    );
  } catch (error) {
    throw new DatabaseError(
      `Failed to get transaction ${transactionId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'GET_TRANSACTION_ERROR',
      error
    );
  }
}

/**
 * Gets transactions for a specific symbol
 *
 * @param userId - User ID
 * @param symbol - Stock symbol
 * @param limit - Maximum number of results (optional)
 * @returns Array of transactions for the symbol
 * @throws DatabaseError if query fails
 */
export async function getTransactionsBySymbol(
  userId: string,
  symbol: string,
  limit?: number
): Promise<Transaction[]> {
  return getTransactions(userId, { symbol, limit });
}

/**
 * Creates a new transaction
 *
 * @param data - Transaction data
 * @returns Created transaction
 * @throws DatabaseError if creation fails
 *
 * @example
 * ```typescript
 * const transaction = await createTransaction({
 *   user_id: userId,
 *   symbol: 'AAPL',
 *   transaction_type: 'BUY',
 *   quantity: 10,
 *   price: 150.00,
 *   notes: 'Initial purchase'
 * });
 * ```
 */
export async function createTransaction(
  data: CreateTransactionInput
): Promise<Transaction> {
  try {
    const id = uuidv4();
    const now = Date.now();
    const totalAmount = data.quantity * data.price;
    const transactionDate = data.transaction_date || now;

    await executeD1(
      `
      INSERT INTO transactions (
        id,
        user_id,
        symbol,
        transaction_type,
        quantity,
        price,
        total_amount,
        transaction_date,
        notes,
        recommendation_id,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        data.user_id,
        data.symbol.toUpperCase(),
        data.transaction_type,
        data.quantity,
        data.price,
        totalAmount,
        transactionDate,
        data.notes || null,
        data.recommendation_id || null,
        now,
      ]
    );

    return {
      id,
      user_id: data.user_id,
      symbol: data.symbol.toUpperCase(),
      transaction_type: data.transaction_type,
      quantity: data.quantity,
      price: data.price,
      total_amount: totalAmount,
      transaction_date: transactionDate,
      notes: data.notes || null,
      recommendation_id: data.recommendation_id || null,
      created_at: now,
    };
  } catch (error) {
    throw new DatabaseError(
      `Failed to create transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'CREATE_TRANSACTION_ERROR',
      error
    );
  }
}

/**
 * Deletes a transaction
 *
 * @param transactionId - Transaction ID to delete
 * @param userId - User ID (for security check)
 * @returns true if deleted, false if not found
 * @throws DatabaseError if deletion fails
 *
 * @example
 * ```typescript
 * const deleted = await deleteTransaction(transactionId, userId);
 * if (deleted) {
 *   console.log('Transaction deleted');
 * }
 * ```
 */
export async function deleteTransaction(
  transactionId: string,
  userId: string
): Promise<boolean> {
  try {
    const result = await executeD1(
      'DELETE FROM transactions WHERE id = ? AND user_id = ?',
      [transactionId, userId]
    );

    return result.changes > 0;
  } catch (error) {
    throw new DatabaseError(
      `Failed to delete transaction ${transactionId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'DELETE_TRANSACTION_ERROR',
      error
    );
  }
}

/**
 * Gets transaction count for a user
 *
 * @param userId - User ID
 * @param filters - Optional filters
 * @returns Total count of transactions
 * @throws DatabaseError if query fails
 */
export async function getTransactionCount(
  userId: string,
  filters?: TransactionFilters
): Promise<number> {
  try {
    const params: unknown[] = [userId];
    const conditions: string[] = ['user_id = ?'];

    // Build WHERE clause from filters
    if (filters) {
      if (filters.symbol) {
        conditions.push('symbol = ?');
        params.push(filters.symbol);
      }

      if (filters.transaction_type) {
        conditions.push('transaction_type = ?');
        params.push(filters.transaction_type);
      }

      if (filters.start_date) {
        conditions.push('transaction_date >= ?');
        params.push(filters.start_date);
      }

      if (filters.end_date) {
        conditions.push('transaction_date <= ?');
        params.push(filters.end_date);
      }
    }

    const whereClause = conditions.join(' AND ');
    const result = await queryFirstD1<{ count: number }>(
      `SELECT COUNT(*) as count FROM transactions WHERE ${whereClause}`,
      params
    );

    return result?.count || 0;
  } catch (error) {
    throw new DatabaseError(
      `Failed to get transaction count: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'GET_TRANSACTION_COUNT_ERROR',
      error
    );
  }
}

/**
 * Gets total invested/withdrawn by transaction type
 *
 * @param userId - User ID
 * @param symbol - Optional symbol to filter by
 * @returns Object with BUY and SELL totals
 * @throws DatabaseError if query fails
 */
export async function getTransactionTotals(
  userId: string,
  symbol?: string
): Promise<{ buy: number; sell: number }> {
  try {
    const params: unknown[] = [userId];
    let symbolFilter = '';

    if (symbol) {
      symbolFilter = 'AND symbol = ?';
      params.push(symbol);
    }

    const results = await queryD1<{
      transaction_type: 'BUY' | 'SELL';
      total: number;
    }>(
      `
      SELECT
        transaction_type,
        SUM(total_amount) as total
      FROM transactions
      WHERE user_id = ? ${symbolFilter}
      GROUP BY transaction_type
      `,
      params
    );

    const totals = { buy: 0, sell: 0 };
    for (const result of results) {
      if (result.transaction_type === 'BUY') {
        totals.buy = result.total;
      } else if (result.transaction_type === 'SELL') {
        totals.sell = result.total;
      }
    }

    return totals;
  } catch (error) {
    throw new DatabaseError(
      `Failed to get transaction totals: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'GET_TRANSACTION_TOTALS_ERROR',
      error
    );
  }
}

/**
 * Gets transactions created from recommendations
 *
 * @param userId - User ID
 * @param recommendationId - Optional specific recommendation ID
 * @returns Array of transactions
 * @throws DatabaseError if query fails
 */
export async function getTransactionsFromRecommendations(
  userId: string,
  recommendationId?: string
): Promise<Transaction[]> {
  try {
    if (recommendationId) {
      return await queryD1<Transaction>(
        'SELECT * FROM transactions WHERE user_id = ? AND recommendation_id = ? ORDER BY transaction_date DESC',
        [userId, recommendationId]
      );
    }

    return await queryD1<Transaction>(
      'SELECT * FROM transactions WHERE user_id = ? AND recommendation_id IS NOT NULL ORDER BY transaction_date DESC',
      [userId]
    );
  } catch (error) {
    throw new DatabaseError(
      `Failed to get transactions from recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'GET_RECOMMENDATION_TRANSACTIONS_ERROR',
      error
    );
  }
}
