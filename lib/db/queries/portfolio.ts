/**
 * Portfolio queries - manage user portfolio and cash balance
 */

import { queryFirstD1, queryD1, executeD1, DatabaseError } from '../client';
import type { Portfolio, Holding, User } from '../schema';

/**
 * Gets the complete portfolio for a user including cash and holdings
 *
 * @param userId - User ID
 * @returns Portfolio with cash balance and stock holdings
 * @throws DatabaseError if query fails
 *
 * @example
 * ```typescript
 * const portfolio = await getPortfolio(userId);
 * console.log(`Cash: $${portfolio.cash_available}`);
 * console.log(`Holdings: ${portfolio.holdings.length} stocks`);
 * console.log(`Total value: $${portfolio.total_value}`);
 * ```
 */
export async function getPortfolio(userId: string): Promise<Portfolio> {
  try {
    // Get user's cash balance
    const user = await queryFirstD1<User>(
      'SELECT cash_available FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      throw new DatabaseError(
        `User not found: ${userId}`,
        'USER_NOT_FOUND'
      );
    }

    // Calculate holdings from transactions
    // Group by symbol and calculate net quantity and average price
    const holdings = await queryD1<Holding>(
      `
      SELECT
        symbol,
        SUM(CASE
          WHEN transaction_type = 'BUY' THEN quantity
          WHEN transaction_type = 'SELL' THEN -quantity
          ELSE 0
        END) as quantity,
        SUM(CASE
          WHEN transaction_type = 'BUY' THEN total_amount
          WHEN transaction_type = 'SELL' THEN -total_amount
          ELSE 0
        END) / NULLIF(SUM(CASE
          WHEN transaction_type = 'BUY' THEN quantity
          WHEN transaction_type = 'SELL' THEN -quantity
          ELSE 0
        END), 0) as average_price,
        SUM(CASE
          WHEN transaction_type = 'BUY' THEN total_amount
          WHEN transaction_type = 'SELL' THEN -total_amount
          ELSE 0
        END) as total_invested
      FROM transactions
      WHERE user_id = ?
      GROUP BY symbol
      HAVING quantity > 0
      ORDER BY symbol ASC
      `,
      [userId]
    );

    // Calculate total portfolio value
    const holdingsValue = holdings.reduce(
      (sum, holding) => sum + holding.total_invested,
      0
    );
    const totalValue = user.cash_available + holdingsValue;

    return {
      user_id: userId,
      cash_available: user.cash_available,
      holdings: holdings.map(h => ({
        symbol: h.symbol,
        quantity: h.quantity,
        average_price: h.average_price || 0,
        total_invested: h.total_invested || 0,
      })),
      total_value: totalValue,
    };
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(
      `Failed to get portfolio for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'GET_PORTFOLIO_ERROR',
      error
    );
  }
}

/**
 * Gets holdings for a specific stock symbol
 *
 * @param userId - User ID
 * @param symbol - Stock symbol
 * @returns Holding information or null if no position
 * @throws DatabaseError if query fails
 */
export async function getHolding(
  userId: string,
  symbol: string
): Promise<Holding | null> {
  try {
    const holding = await queryFirstD1<Holding>(
      `
      SELECT
        symbol,
        SUM(CASE
          WHEN transaction_type = 'BUY' THEN quantity
          WHEN transaction_type = 'SELL' THEN -quantity
          ELSE 0
        END) as quantity,
        SUM(CASE
          WHEN transaction_type = 'BUY' THEN total_amount
          WHEN transaction_type = 'SELL' THEN -total_amount
          ELSE 0
        END) / NULLIF(SUM(CASE
          WHEN transaction_type = 'BUY' THEN quantity
          WHEN transaction_type = 'SELL' THEN -quantity
          ELSE 0
        END), 0) as average_price,
        SUM(CASE
          WHEN transaction_type = 'BUY' THEN total_amount
          WHEN transaction_type = 'SELL' THEN -total_amount
          ELSE 0
        END) as total_invested
      FROM transactions
      WHERE user_id = ? AND symbol = ?
      GROUP BY symbol
      HAVING quantity > 0
      `,
      [userId, symbol]
    );

    if (!holding) {
      return null;
    }

    return {
      symbol: holding.symbol,
      quantity: holding.quantity,
      average_price: holding.average_price || 0,
      total_invested: holding.total_invested || 0,
    };
  } catch (error) {
    throw new DatabaseError(
      `Failed to get holding for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'GET_HOLDING_ERROR',
      error
    );
  }
}

/**
 * Updates user's cash balance
 *
 * @param userId - User ID
 * @param amount - Amount to add (positive) or subtract (negative)
 * @returns New cash balance
 * @throws DatabaseError if query fails or insufficient funds
 *
 * @example
 * ```typescript
 * // Add $1000
 * await updateCash(userId, 1000);
 *
 * // Subtract $500 (for a purchase)
 * await updateCash(userId, -500);
 * ```
 */
export async function updateCash(
  userId: string,
  amount: number
): Promise<number> {
  try {
    // Get current cash balance
    const user = await queryFirstD1<User>(
      'SELECT cash_available FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      throw new DatabaseError(
        `User not found: ${userId}`,
        'USER_NOT_FOUND'
      );
    }

    const newBalance = user.cash_available + amount;

    // Check for negative balance
    if (newBalance < 0) {
      throw new DatabaseError(
        `Insufficient funds. Current: ${user.cash_available}, Requested: ${amount}`,
        'INSUFFICIENT_FUNDS'
      );
    }

    // Update cash balance
    await executeD1(
      'UPDATE users SET cash_available = ?, updated_at = ? WHERE id = ?',
      [newBalance, Date.now(), userId]
    );

    return newBalance;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(
      `Failed to update cash for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'UPDATE_CASH_ERROR',
      error
    );
  }
}

/**
 * Sets user's cash balance to a specific amount
 *
 * @param userId - User ID
 * @param amount - New cash balance (must be >= 0)
 * @returns New cash balance
 * @throws DatabaseError if query fails or amount is negative
 */
export async function setCash(
  userId: string,
  amount: number
): Promise<number> {
  if (amount < 0) {
    throw new DatabaseError(
      'Cash balance cannot be negative',
      'INVALID_AMOUNT'
    );
  }

  try {
    await executeD1(
      'UPDATE users SET cash_available = ?, updated_at = ? WHERE id = ?',
      [amount, Date.now(), userId]
    );

    return amount;
  } catch (error) {
    throw new DatabaseError(
      `Failed to set cash for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'SET_CASH_ERROR',
      error
    );
  }
}

/**
 * Gets user's current cash balance
 *
 * @param userId - User ID
 * @returns Current cash balance
 * @throws DatabaseError if user not found
 */
export async function getCashBalance(userId: string): Promise<number> {
  try {
    const user = await queryFirstD1<User>(
      'SELECT cash_available FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      throw new DatabaseError(
        `User not found: ${userId}`,
        'USER_NOT_FOUND'
      );
    }

    return user.cash_available;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(
      `Failed to get cash balance for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'GET_CASH_ERROR',
      error
    );
  }
}

/**
 * Creates a new user with initial cash balance
 *
 * @param userId - User ID (should match Clerk user ID)
 * @param email - User email
 * @param initialCash - Initial cash balance (defaults to 0)
 * @returns Created user
 * @throws DatabaseError if user creation fails
 */
export async function createUser(
  userId: string,
  email: string,
  initialCash = 0
): Promise<User> {
  if (initialCash < 0) {
    throw new DatabaseError(
      'Initial cash balance cannot be negative',
      'INVALID_AMOUNT'
    );
  }

  try {
    const now = Date.now();
    await executeD1(
      'INSERT INTO users (id, email, cash_available, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [userId, email, initialCash, now, now]
    );

    return {
      id: userId,
      email,
      cash_available: initialCash,
      created_at: now,
      updated_at: now,
    };
  } catch (error) {
    throw new DatabaseError(
      `Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'CREATE_USER_ERROR',
      error
    );
  }
}

/**
 * Gets user by ID
 *
 * @param userId - User ID
 * @returns User or null if not found
 * @throws DatabaseError if query fails
 */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    return await queryFirstD1<User>(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
  } catch (error) {
    throw new DatabaseError(
      `Failed to get user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'GET_USER_ERROR',
      error
    );
  }
}

/**
 * Gets user by email
 *
 * @param email - User email
 * @returns User or null if not found
 * @throws DatabaseError if query fails
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    return await queryFirstD1<User>(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
  } catch (error) {
    throw new DatabaseError(
      `Failed to get user by email ${email}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'GET_USER_ERROR',
      error
    );
  }
}
