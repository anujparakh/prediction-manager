/**
 * Rules queries - manage automated trading rules
 */

import { v4 as uuidv4 } from 'uuid';
import { queryD1, queryFirstD1, executeD1, DatabaseError } from '../client';
import type {
  Rule,
  CreateRuleInput,
  UpdateRuleInput,
  RuleFilters,
} from '../schema';

/**
 * Gets all rules for a user with optional filters
 *
 * @param userId - User ID
 * @param filters - Optional filters for rules
 * @returns Array of rules matching filters
 * @throws DatabaseError if query fails
 *
 * @example
 * ```typescript
 * // Get all active rules
 * const activeRules = await getRules(userId, { is_active: true });
 *
 * // Get rules for specific symbol
 * const appleRules = await getRules(userId, { symbol: 'AAPL' });
 * ```
 */
export async function getRules(
  userId: string,
  filters?: RuleFilters
): Promise<Rule[]> {
  try {
    const params: unknown[] = [userId];
    const conditions: string[] = ['user_id = ?'];

    // Build WHERE clause from filters
    if (filters) {
      if (filters.symbol) {
        conditions.push('symbol = ?');
        params.push(filters.symbol);
      }

      if (filters.is_active !== undefined) {
        conditions.push('is_active = ?');
        params.push(filters.is_active ? 1 : 0);
      }
    }

    const whereClause = conditions.join(' AND ');

    // Build query with optional LIMIT and OFFSET
    let query = `
      SELECT * FROM rules
      WHERE ${whereClause}
      ORDER BY created_at DESC
    `;

    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters?.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }

    return await queryD1<Rule>(query, params);
  } catch (error) {
    throw new DatabaseError(
      `Failed to get rules: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'GET_RULES_ERROR',
      error
    );
  }
}

/**
 * Gets a single rule by ID
 *
 * @param ruleId - Rule ID
 * @param userId - User ID (for security check)
 * @returns Rule or null if not found or doesn't belong to user
 * @throws DatabaseError if query fails
 */
export async function getRuleById(
  ruleId: string,
  userId: string
): Promise<Rule | null> {
  try {
    return await queryFirstD1<Rule>(
      'SELECT * FROM rules WHERE id = ? AND user_id = ?',
      [ruleId, userId]
    );
  } catch (error) {
    throw new DatabaseError(
      `Failed to get rule ${ruleId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'GET_RULE_ERROR',
      error
    );
  }
}

/**
 * Gets all active rules for a specific symbol
 *
 * @param userId - User ID
 * @param symbol - Stock symbol
 * @returns Array of active rules for the symbol
 * @throws DatabaseError if query fails
 */
export async function getActiveRulesForSymbol(
  userId: string,
  symbol: string
): Promise<Rule[]> {
  return getRules(userId, { symbol, is_active: true });
}

/**
 * Gets all active rules across all symbols
 *
 * @param userId - User ID
 * @returns Array of all active rules
 * @throws DatabaseError if query fails
 */
export async function getAllActiveRules(userId: string): Promise<Rule[]> {
  return getRules(userId, { is_active: true });
}

/**
 * Creates a new rule
 *
 * @param data - Rule data
 * @returns Created rule
 * @throws DatabaseError if creation fails
 *
 * @example
 * ```typescript
 * const rule = await createRule({
 *   user_id: userId,
 *   name: 'Buy AAPL on RSI < 30',
 *   description: 'Buy when oversold',
 *   expression: 'rsi < 30 && volume > 1000000',
 *   action: 'BUY',
 *   symbol: 'AAPL',
 *   quantity_type: 'FIXED',
 *   quantity_value: '10'
 * });
 * ```
 */
export async function createRule(data: CreateRuleInput): Promise<Rule> {
  try {
    const id = uuidv4();
    const now = Date.now();
    const isActive = data.is_active !== false ? 1 : 0;

    await executeD1(
      `
      INSERT INTO rules (
        id,
        user_id,
        name,
        description,
        expression,
        action,
        symbol,
        quantity_type,
        quantity_value,
        is_active,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        data.user_id,
        data.name,
        data.description || null,
        data.expression,
        data.action,
        data.symbol.toUpperCase(),
        data.quantity_type,
        data.quantity_value,
        isActive,
        now,
        now,
      ]
    );

    return {
      id,
      user_id: data.user_id,
      name: data.name,
      description: data.description || null,
      expression: data.expression,
      action: data.action,
      symbol: data.symbol.toUpperCase(),
      quantity_type: data.quantity_type,
      quantity_value: data.quantity_value,
      is_active: isActive,
      created_at: now,
      updated_at: now,
    };
  } catch (error) {
    throw new DatabaseError(
      `Failed to create rule: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'CREATE_RULE_ERROR',
      error
    );
  }
}

/**
 * Updates an existing rule
 *
 * @param ruleId - Rule ID to update
 * @param userId - User ID (for security check)
 * @param data - Fields to update
 * @returns Updated rule or null if not found
 * @throws DatabaseError if update fails
 *
 * @example
 * ```typescript
 * const updated = await updateRule(ruleId, userId, {
 *   expression: 'rsi < 25',
 *   is_active: false
 * });
 * ```
 */
export async function updateRule(
  ruleId: string,
  userId: string,
  data: UpdateRuleInput
): Promise<Rule | null> {
  try {
    // Check if rule exists and belongs to user
    const existingRule = await getRuleById(ruleId, userId);
    if (!existingRule) {
      return null;
    }

    // Build UPDATE query dynamically based on provided fields
    const updates: string[] = [];
    const params: unknown[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }

    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description || null);
    }

    if (data.expression !== undefined) {
      updates.push('expression = ?');
      params.push(data.expression);
    }

    if (data.action !== undefined) {
      updates.push('action = ?');
      params.push(data.action);
    }

    if (data.symbol !== undefined) {
      updates.push('symbol = ?');
      params.push(data.symbol.toUpperCase());
    }

    if (data.quantity_type !== undefined) {
      updates.push('quantity_type = ?');
      params.push(data.quantity_type);
    }

    if (data.quantity_value !== undefined) {
      updates.push('quantity_value = ?');
      params.push(data.quantity_value);
    }

    if (data.is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(data.is_active ? 1 : 0);
    }

    // Always update updated_at
    const now = Date.now();
    updates.push('updated_at = ?');
    params.push(now);

    // Add WHERE clause parameters
    params.push(ruleId);
    params.push(userId);

    if (updates.length === 0) {
      // No fields to update, return existing rule
      return existingRule;
    }

    await executeD1(
      `UPDATE rules SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );

    // Return updated rule
    return await getRuleById(ruleId, userId);
  } catch (error) {
    throw new DatabaseError(
      `Failed to update rule ${ruleId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'UPDATE_RULE_ERROR',
      error
    );
  }
}

/**
 * Deletes a rule
 *
 * @param ruleId - Rule ID to delete
 * @param userId - User ID (for security check)
 * @returns true if deleted, false if not found
 * @throws DatabaseError if deletion fails
 *
 * @example
 * ```typescript
 * const deleted = await deleteRule(ruleId, userId);
 * if (deleted) {
 *   console.log('Rule deleted');
 * }
 * ```
 */
export async function deleteRule(
  ruleId: string,
  userId: string
): Promise<boolean> {
  try {
    const result = await executeD1(
      'DELETE FROM rules WHERE id = ? AND user_id = ?',
      [ruleId, userId]
    );

    return result.changes > 0;
  } catch (error) {
    throw new DatabaseError(
      `Failed to delete rule ${ruleId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'DELETE_RULE_ERROR',
      error
    );
  }
}

/**
 * Toggles rule active status
 *
 * @param ruleId - Rule ID
 * @param userId - User ID (for security check)
 * @returns Updated rule or null if not found
 * @throws DatabaseError if update fails
 *
 * @example
 * ```typescript
 * const rule = await toggleRuleActive(ruleId, userId);
 * console.log(`Rule is now ${rule.is_active ? 'active' : 'inactive'}`);
 * ```
 */
export async function toggleRuleActive(
  ruleId: string,
  userId: string
): Promise<Rule | null> {
  try {
    const rule = await getRuleById(ruleId, userId);
    if (!rule) {
      return null;
    }

    const newActiveStatus = rule.is_active === 1 ? 0 : 1;
    const now = Date.now();

    await executeD1(
      'UPDATE rules SET is_active = ?, updated_at = ? WHERE id = ? AND user_id = ?',
      [newActiveStatus, now, ruleId, userId]
    );

    return await getRuleById(ruleId, userId);
  } catch (error) {
    throw new DatabaseError(
      `Failed to toggle rule ${ruleId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'TOGGLE_RULE_ERROR',
      error
    );
  }
}

/**
 * Sets rule active status
 *
 * @param ruleId - Rule ID
 * @param userId - User ID (for security check)
 * @param isActive - New active status
 * @returns Updated rule or null if not found
 * @throws DatabaseError if update fails
 */
export async function setRuleActive(
  ruleId: string,
  userId: string,
  isActive: boolean
): Promise<Rule | null> {
  return updateRule(ruleId, userId, { is_active: isActive });
}

/**
 * Gets count of rules for a user
 *
 * @param userId - User ID
 * @param filters - Optional filters
 * @returns Total count of rules
 * @throws DatabaseError if query fails
 */
export async function getRuleCount(
  userId: string,
  filters?: RuleFilters
): Promise<number> {
  try {
    const params: unknown[] = [userId];
    const conditions: string[] = ['user_id = ?'];

    if (filters) {
      if (filters.symbol) {
        conditions.push('symbol = ?');
        params.push(filters.symbol);
      }

      if (filters.is_active !== undefined) {
        conditions.push('is_active = ?');
        params.push(filters.is_active ? 1 : 0);
      }
    }

    const whereClause = conditions.join(' AND ');
    const result = await queryFirstD1<{ count: number }>(
      `SELECT COUNT(*) as count FROM rules WHERE ${whereClause}`,
      params
    );

    return result?.count || 0;
  } catch (error) {
    throw new DatabaseError(
      `Failed to get rule count: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'GET_RULE_COUNT_ERROR',
      error
    );
  }
}

/**
 * Gets all unique symbols that have rules
 *
 * @param userId - User ID
 * @param activeOnly - Only return symbols with active rules (default: false)
 * @returns Array of unique symbols
 * @throws DatabaseError if query fails
 */
export async function getRuleSymbols(
  userId: string,
  activeOnly = false
): Promise<string[]> {
  try {
    const params: unknown[] = [userId];
    let query = 'SELECT DISTINCT symbol FROM rules WHERE user_id = ?';

    if (activeOnly) {
      query += ' AND is_active = 1';
    }

    query += ' ORDER BY symbol ASC';

    const results = await queryD1<{ symbol: string }>(query, params);
    return results.map(r => r.symbol);
  } catch (error) {
    throw new DatabaseError(
      `Failed to get rule symbols: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'GET_RULE_SYMBOLS_ERROR',
      error
    );
  }
}
