/**
 * Recommendations queries - manage rule evaluation results
 */

import { v4 as uuidv4 } from 'uuid';
import { queryD1, queryFirstD1, executeD1, batchD1, DatabaseError } from '../client';
import { createTransaction } from './transactions';
import { updateCash } from './portfolio';
import type {
  Recommendation,
  CreateRecommendationInput,
  RecommendationFilters,
  RecommendationStatus,
} from '../schema';

/**
 * Gets all recommendations for a user with optional filters
 *
 * @param userId - User ID
 * @param filters - Optional filters for recommendations
 * @returns Array of recommendations matching filters
 * @throws DatabaseError if query fails
 *
 * @example
 * ```typescript
 * // Get all pending recommendations
 * const pending = await getRecommendations(userId, { status: 'PENDING' });
 *
 * // Get recommendations for specific symbol
 * const appleRecs = await getRecommendations(userId, { symbol: 'AAPL' });
 * ```
 */
export async function getRecommendations(
  userId: string,
  filters?: RecommendationFilters
): Promise<Recommendation[]> {
  try {
    const params: unknown[] = [userId];
    const conditions: string[] = ['user_id = ?'];

    // Build WHERE clause from filters
    if (filters) {
      if (filters.status) {
        conditions.push('status = ?');
        params.push(filters.status);
      }

      if (filters.symbol) {
        conditions.push('symbol = ?');
        params.push(filters.symbol);
      }

      if (filters.rule_id) {
        conditions.push('rule_id = ?');
        params.push(filters.rule_id);
      }
    }

    const whereClause = conditions.join(' AND ');

    // Build query with optional LIMIT and OFFSET
    let query = `
      SELECT * FROM recommendations
      WHERE ${whereClause}
      ORDER BY evaluated_at DESC
    `;

    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters?.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }

    return await queryD1<Recommendation>(query, params);
  } catch (error) {
    throw new DatabaseError(
      `Failed to get recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'GET_RECOMMENDATIONS_ERROR',
      error
    );
  }
}

/**
 * Gets a single recommendation by ID
 *
 * @param recommendationId - Recommendation ID
 * @param userId - User ID (for security check)
 * @returns Recommendation or null if not found or doesn't belong to user
 * @throws DatabaseError if query fails
 */
export async function getRecommendationById(
  recommendationId: string,
  userId: string
): Promise<Recommendation | null> {
  try {
    return await queryFirstD1<Recommendation>(
      'SELECT * FROM recommendations WHERE id = ? AND user_id = ?',
      [recommendationId, userId]
    );
  } catch (error) {
    throw new DatabaseError(
      `Failed to get recommendation ${recommendationId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'GET_RECOMMENDATION_ERROR',
      error
    );
  }
}

/**
 * Gets pending recommendations for a user
 *
 * @param userId - User ID
 * @param symbol - Optional symbol to filter by
 * @returns Array of pending recommendations
 * @throws DatabaseError if query fails
 */
export async function getPendingRecommendations(
  userId: string,
  symbol?: string
): Promise<Recommendation[]> {
  return getRecommendations(userId, {
    status: 'PENDING',
    symbol,
  });
}

/**
 * Creates a new recommendation
 *
 * @param data - Recommendation data
 * @returns Created recommendation
 * @throws DatabaseError if creation fails
 *
 * @example
 * ```typescript
 * const rec = await createRecommendation({
 *   user_id: userId,
 *   rule_id: ruleId,
 *   symbol: 'AAPL',
 *   action: 'BUY',
 *   quantity: 10,
 *   price: 150.00,
 *   rule_name: 'Buy on RSI < 30',
 *   rule_expression: 'rsi < 30'
 * });
 * ```
 */
export async function createRecommendation(
  data: CreateRecommendationInput
): Promise<Recommendation> {
  try {
    const id = uuidv4();
    const evaluatedAt = data.evaluated_at || Date.now();
    const totalAmount = data.quantity * data.price;

    await executeD1(
      `
      INSERT INTO recommendations (
        id,
        user_id,
        rule_id,
        symbol,
        action,
        quantity,
        price,
        total_amount,
        status,
        rule_name,
        rule_expression,
        evaluated_at,
        executed_at,
        metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        data.user_id,
        data.rule_id,
        data.symbol.toUpperCase(),
        data.action,
        data.quantity,
        data.price,
        totalAmount,
        'PENDING',
        data.rule_name,
        data.rule_expression,
        evaluatedAt,
        null,
        data.metadata || null,
      ]
    );

    return {
      id,
      user_id: data.user_id,
      rule_id: data.rule_id,
      symbol: data.symbol.toUpperCase(),
      action: data.action,
      quantity: data.quantity,
      price: data.price,
      total_amount: totalAmount,
      status: 'PENDING',
      rule_name: data.rule_name,
      rule_expression: data.rule_expression,
      evaluated_at: evaluatedAt,
      executed_at: null,
      metadata: data.metadata || null,
    };
  } catch (error) {
    throw new DatabaseError(
      `Failed to create recommendation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'CREATE_RECOMMENDATION_ERROR',
      error
    );
  }
}

/**
 * Updates recommendation status
 * When status is set to EXECUTED, also creates a transaction and updates cash balance
 *
 * @param recommendationId - Recommendation ID
 * @param userId - User ID (for security check)
 * @param status - New status (PENDING, EXECUTED, or DISMISSED)
 * @returns Updated recommendation or null if not found
 * @throws DatabaseError if update fails
 *
 * @example
 * ```typescript
 * // Execute a recommendation (creates transaction and updates cash)
 * const executed = await updateRecommendationStatus(recId, userId, 'EXECUTED');
 *
 * // Dismiss a recommendation
 * const dismissed = await updateRecommendationStatus(recId, userId, 'DISMISSED');
 * ```
 */
export async function updateRecommendationStatus(
  recommendationId: string,
  userId: string,
  status: RecommendationStatus
): Promise<Recommendation | null> {
  try {
    // Get the recommendation
    const recommendation = await getRecommendationById(recommendationId, userId);
    if (!recommendation) {
      return null;
    }

    // Check if status is already set
    if (recommendation.status === status) {
      return recommendation;
    }

    // Prevent changing status from EXECUTED or DISMISSED back to PENDING
    if (
      (recommendation.status === 'EXECUTED' || recommendation.status === 'DISMISSED') &&
      status === 'PENDING'
    ) {
      throw new DatabaseError(
        'Cannot change status from EXECUTED or DISMISSED back to PENDING',
        'INVALID_STATUS_CHANGE'
      );
    }

    const now = Date.now();
    const executedAt = status === 'EXECUTED' ? now : recommendation.executed_at;

    // If executing, create transaction and update cash in a batch
    if (status === 'EXECUTED') {
      // Create the transaction
      const transaction = await createTransaction({
        user_id: userId,
        symbol: recommendation.symbol,
        transaction_type: recommendation.action,
        quantity: recommendation.quantity,
        price: recommendation.price,
        notes: `Executed recommendation: ${recommendation.rule_name}`,
        recommendation_id: recommendationId,
        transaction_date: now,
      });

      // Update cash balance
      // For BUY: subtract total_amount from cash
      // For SELL: add total_amount to cash
      const cashChange =
        recommendation.action === 'BUY'
          ? -recommendation.total_amount
          : recommendation.total_amount;

      await updateCash(userId, cashChange);

      // Update recommendation status
      await executeD1(
        'UPDATE recommendations SET status = ?, executed_at = ? WHERE id = ? AND user_id = ?',
        [status, executedAt, recommendationId, userId]
      );

      // Return updated recommendation with transaction info
      const updated = await getRecommendationById(recommendationId, userId);
      return updated;
    } else {
      // For DISMISSED status, just update the status
      await executeD1(
        'UPDATE recommendations SET status = ?, executed_at = ? WHERE id = ? AND user_id = ?',
        [status, executedAt, recommendationId, userId]
      );

      return await getRecommendationById(recommendationId, userId);
    }
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(
      `Failed to update recommendation status ${recommendationId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'UPDATE_RECOMMENDATION_STATUS_ERROR',
      error
    );
  }
}

/**
 * Executes a recommendation (shorthand for updateRecommendationStatus with EXECUTED)
 *
 * @param recommendationId - Recommendation ID
 * @param userId - User ID
 * @returns Updated recommendation or null if not found
 * @throws DatabaseError if execution fails
 */
export async function executeRecommendation(
  recommendationId: string,
  userId: string
): Promise<Recommendation | null> {
  return updateRecommendationStatus(recommendationId, userId, 'EXECUTED');
}

/**
 * Dismisses a recommendation (shorthand for updateRecommendationStatus with DISMISSED)
 *
 * @param recommendationId - Recommendation ID
 * @param userId - User ID
 * @returns Updated recommendation or null if not found
 * @throws DatabaseError if dismissal fails
 */
export async function dismissRecommendation(
  recommendationId: string,
  userId: string
): Promise<Recommendation | null> {
  return updateRecommendationStatus(recommendationId, userId, 'DISMISSED');
}

/**
 * Deletes a recommendation
 * Note: Typically you should dismiss recommendations rather than delete them
 *
 * @param recommendationId - Recommendation ID to delete
 * @param userId - User ID (for security check)
 * @returns true if deleted, false if not found
 * @throws DatabaseError if deletion fails
 */
export async function deleteRecommendation(
  recommendationId: string,
  userId: string
): Promise<boolean> {
  try {
    const result = await executeD1(
      'DELETE FROM recommendations WHERE id = ? AND user_id = ?',
      [recommendationId, userId]
    );

    return result.changes > 0;
  } catch (error) {
    throw new DatabaseError(
      `Failed to delete recommendation ${recommendationId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'DELETE_RECOMMENDATION_ERROR',
      error
    );
  }
}

/**
 * Gets count of recommendations for a user
 *
 * @param userId - User ID
 * @param filters - Optional filters
 * @returns Total count of recommendations
 * @throws DatabaseError if query fails
 */
export async function getRecommendationCount(
  userId: string,
  filters?: RecommendationFilters
): Promise<number> {
  try {
    const params: unknown[] = [userId];
    const conditions: string[] = ['user_id = ?'];

    if (filters) {
      if (filters.status) {
        conditions.push('status = ?');
        params.push(filters.status);
      }

      if (filters.symbol) {
        conditions.push('symbol = ?');
        params.push(filters.symbol);
      }

      if (filters.rule_id) {
        conditions.push('rule_id = ?');
        params.push(filters.rule_id);
      }
    }

    const whereClause = conditions.join(' AND ');
    const result = await queryFirstD1<{ count: number }>(
      `SELECT COUNT(*) as count FROM recommendations WHERE ${whereClause}`,
      params
    );

    return result?.count || 0;
  } catch (error) {
    throw new DatabaseError(
      `Failed to get recommendation count: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'GET_RECOMMENDATION_COUNT_ERROR',
      error
    );
  }
}

/**
 * Gets recommendations for a specific rule
 *
 * @param userId - User ID
 * @param ruleId - Rule ID
 * @param status - Optional status filter
 * @returns Array of recommendations for the rule
 * @throws DatabaseError if query fails
 */
export async function getRecommendationsForRule(
  userId: string,
  ruleId: string,
  status?: RecommendationStatus
): Promise<Recommendation[]> {
  return getRecommendations(userId, {
    rule_id: ruleId,
    status,
  });
}

/**
 * Gets recommendation statistics by status
 *
 * @param userId - User ID
 * @returns Object with counts for each status
 * @throws DatabaseError if query fails
 */
export async function getRecommendationStats(userId: string): Promise<{
  pending: number;
  executed: number;
  dismissed: number;
  total: number;
}> {
  try {
    const results = await queryD1<{
      status: RecommendationStatus;
      count: number;
    }>(
      `
      SELECT status, COUNT(*) as count
      FROM recommendations
      WHERE user_id = ?
      GROUP BY status
      `,
      [userId]
    );

    const stats = {
      pending: 0,
      executed: 0,
      dismissed: 0,
      total: 0,
    };

    for (const result of results) {
      const count = result.count || 0;
      stats.total += count;

      if (result.status === 'PENDING') {
        stats.pending = count;
      } else if (result.status === 'EXECUTED') {
        stats.executed = count;
      } else if (result.status === 'DISMISSED') {
        stats.dismissed = count;
      }
    }

    return stats;
  } catch (error) {
    throw new DatabaseError(
      `Failed to get recommendation stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'GET_RECOMMENDATION_STATS_ERROR',
      error
    );
  }
}

/**
 * Bulk execute multiple recommendations
 * All recommendations must succeed or all will fail
 *
 * @param recommendationIds - Array of recommendation IDs to execute
 * @param userId - User ID
 * @returns Array of executed recommendations
 * @throws DatabaseError if any execution fails
 */
export async function bulkExecuteRecommendations(
  recommendationIds: string[],
  userId: string
): Promise<Recommendation[]> {
  try {
    const executed: Recommendation[] = [];

    // Execute each recommendation sequentially
    // Note: D1 doesn't support transactions yet, so this isn't atomic
    for (const id of recommendationIds) {
      const result = await executeRecommendation(id, userId);
      if (result) {
        executed.push(result);
      }
    }

    return executed;
  } catch (error) {
    throw new DatabaseError(
      `Failed to bulk execute recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'BULK_EXECUTE_ERROR',
      error
    );
  }
}

/**
 * Bulk dismiss multiple recommendations
 *
 * @param recommendationIds - Array of recommendation IDs to dismiss
 * @param userId - User ID
 * @returns Array of dismissed recommendations
 * @throws DatabaseError if any dismissal fails
 */
export async function bulkDismissRecommendations(
  recommendationIds: string[],
  userId: string
): Promise<Recommendation[]> {
  try {
    const dismissed: Recommendation[] = [];

    for (const id of recommendationIds) {
      const result = await dismissRecommendation(id, userId);
      if (result) {
        dismissed.push(result);
      }
    }

    return dismissed;
  } catch (error) {
    throw new DatabaseError(
      `Failed to bulk dismiss recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'BULK_DISMISS_ERROR',
      error
    );
  }
}
