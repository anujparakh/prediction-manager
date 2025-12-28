/**
 * User initialization helpers
 * Ensures users exist in database when they first access the app
 */

import { getUserById, createUser } from './portfolio';

/**
 * Ensures user exists in database, creates if needed
 * @param userId Clerk user ID
 * @param email User email
 * @returns User record
 */
export async function ensureUserExists(
  userId: string,
  email: string
): Promise<void> {
  try {
    // Check if user already exists
    const existingUser = await getUserById(userId);

    if (!existingUser) {
      // Create new user with initial cash balance of $10,000
      console.log(`[User Init] Creating new user ${userId} with email ${email}`);
      await createUser(userId, email, 10000);
      console.log(`[User Init] User created successfully with $10,000 initial cash`);
    }
  } catch (error) {
    console.error(`[User Init] Error ensuring user exists:`, error);
    // Don't throw - allow the app to continue even if user creation fails
    // The API endpoints will handle missing users appropriately
  }
}
