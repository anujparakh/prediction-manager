/**
 * Database schema TypeScript interfaces
 * Matches the D1 database schema defined in migrations
 */

/**
 * User table - stores user account information and cash balance
 */
export interface User {
  /** User ID (UUID) - matches Clerk user ID */
  id: string;
  /** User email address */
  email: string;
  /** Available cash balance for trading */
  cash_available: number;
  /** Unix timestamp when user was created */
  created_at: number;
  /** Unix timestamp when user was last updated */
  updated_at: number;
}

/**
 * Transaction types for buying and selling stocks
 */
export type TransactionType = 'BUY' | 'SELL';

/**
 * Transaction table - stores all buy/sell transactions
 */
export interface Transaction {
  /** Transaction ID (UUID) */
  id: string;
  /** User ID (foreign key to users.id) */
  user_id: string;
  /** Stock symbol (e.g., AAPL, GOOGL) */
  symbol: string;
  /** Type of transaction (BUY or SELL) */
  transaction_type: TransactionType;
  /** Number of shares */
  quantity: number;
  /** Price per share at time of transaction */
  price: number;
  /** Total transaction amount (quantity * price) */
  total_amount: number;
  /** Unix timestamp when transaction occurred */
  transaction_date: number;
  /** Optional notes about the transaction */
  notes: string | null;
  /** Optional recommendation ID if transaction came from a recommendation */
  recommendation_id: string | null;
  /** Unix timestamp when record was created */
  created_at: number;
}

/**
 * Rule action types for automated trading
 */
export type RuleAction = 'BUY' | 'SELL';

/**
 * Quantity calculation types for rules
 */
export type QuantityType = 'FIXED' | 'PERCENTAGE' | 'EXPRESSION';

/**
 * Rule table - stores automated trading rules
 */
export interface Rule {
  /** Rule ID (UUID) */
  id: string;
  /** User ID (foreign key to users.id) */
  user_id: string;
  /** Rule name */
  name: string;
  /** Optional rule description */
  description: string | null;
  /** Boolean expression to evaluate (e.g., "rsi < 30 && volume > 1000000") */
  expression: string;
  /** Action to take when rule evaluates to true */
  action: RuleAction;
  /** Stock symbol this rule applies to */
  symbol: string;
  /** How to calculate quantity (FIXED, PERCENTAGE of portfolio, or EXPRESSION) */
  quantity_type: QuantityType;
  /** Value for quantity calculation (number for FIXED/PERCENTAGE, expression string for EXPRESSION) */
  quantity_value: string;
  /** Whether rule is active (1) or inactive (0) */
  is_active: number;
  /** Unix timestamp when rule was created */
  created_at: number;
  /** Unix timestamp when rule was last updated */
  updated_at: number;
}

/**
 * Recommendation status types
 */
export type RecommendationStatus = 'PENDING' | 'EXECUTED' | 'DISMISSED';

/**
 * Recommendation table - stores rule evaluation results
 */
export interface Recommendation {
  /** Recommendation ID (UUID) */
  id: string;
  /** User ID (foreign key to users.id) */
  user_id: string;
  /** Rule ID that generated this recommendation (foreign key to rules.id) */
  rule_id: string;
  /** Stock symbol */
  symbol: string;
  /** Recommended action (BUY or SELL) */
  action: RuleAction;
  /** Recommended quantity of shares */
  quantity: number;
  /** Price per share when recommendation was made */
  price: number;
  /** Total amount (quantity * price) */
  total_amount: number;
  /** Current status of recommendation */
  status: RecommendationStatus;
  /** Name of the rule that generated this recommendation */
  rule_name: string;
  /** Expression of the rule that generated this recommendation */
  rule_expression: string;
  /** Unix timestamp when rule was evaluated */
  evaluated_at: number;
  /** Unix timestamp when recommendation was executed (null if not executed) */
  executed_at: number | null;
  /** Optional JSON metadata about the recommendation */
  metadata: string | null;
}

/**
 * Portfolio holding - calculated from transactions
 * This is not a database table, but a computed result
 */
export interface Holding {
  /** Stock symbol */
  symbol: string;
  /** Total shares owned */
  quantity: number;
  /** Average cost basis per share */
  average_price: number;
  /** Total invested (quantity * average_price) */
  total_invested: number;
}

/**
 * Complete portfolio - cash + holdings
 * This is not a database table, but a computed result
 */
export interface Portfolio {
  /** User ID */
  user_id: string;
  /** Available cash balance */
  cash_available: number;
  /** Array of stock holdings */
  holdings: Holding[];
  /** Total portfolio value (cash + sum of holdings) */
  total_value: number;
}

/**
 * Input type for creating a new user
 */
export interface CreateUserInput {
  /** User ID (UUID) - should match Clerk user ID */
  id: string;
  /** User email address */
  email: string;
  /** Initial cash balance (defaults to 0) */
  cash_available?: number;
}

/**
 * Input type for creating a new transaction
 */
export interface CreateTransactionInput {
  /** User ID */
  user_id: string;
  /** Stock symbol */
  symbol: string;
  /** Transaction type (BUY or SELL) */
  transaction_type: TransactionType;
  /** Number of shares */
  quantity: number;
  /** Price per share */
  price: number;
  /** Optional notes */
  notes?: string;
  /** Optional recommendation ID */
  recommendation_id?: string;
  /** Optional transaction date (defaults to now) */
  transaction_date?: number;
}

/**
 * Input type for creating a new rule
 */
export interface CreateRuleInput {
  /** User ID */
  user_id: string;
  /** Rule name */
  name: string;
  /** Optional description */
  description?: string;
  /** Boolean expression */
  expression: string;
  /** Action to take */
  action: RuleAction;
  /** Stock symbol */
  symbol: string;
  /** Quantity calculation type */
  quantity_type: QuantityType;
  /** Quantity value */
  quantity_value: string;
  /** Whether rule is active (defaults to true) */
  is_active?: boolean;
}

/**
 * Input type for updating a rule
 */
export interface UpdateRuleInput {
  /** Rule name */
  name?: string;
  /** Description */
  description?: string;
  /** Boolean expression */
  expression?: string;
  /** Action to take */
  action?: RuleAction;
  /** Stock symbol */
  symbol?: string;
  /** Quantity calculation type */
  quantity_type?: QuantityType;
  /** Quantity value */
  quantity_value?: string;
  /** Whether rule is active */
  is_active?: boolean;
}

/**
 * Input type for creating a new recommendation
 */
export interface CreateRecommendationInput {
  /** User ID */
  user_id: string;
  /** Rule ID */
  rule_id: string;
  /** Stock symbol */
  symbol: string;
  /** Recommended action */
  action: RuleAction;
  /** Recommended quantity */
  quantity: number;
  /** Price at time of recommendation */
  price: number;
  /** Rule name */
  rule_name: string;
  /** Rule expression */
  rule_expression: string;
  /** Optional metadata */
  metadata?: string;
  /** Optional evaluation timestamp (defaults to now) */
  evaluated_at?: number;
}

/**
 * Filter options for querying transactions
 */
export interface TransactionFilters {
  /** Filter by stock symbol */
  symbol?: string;
  /** Filter by transaction type */
  transaction_type?: TransactionType;
  /** Filter by start date (Unix timestamp) */
  start_date?: number;
  /** Filter by end date (Unix timestamp) */
  end_date?: number;
  /** Limit number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Filter options for querying rules
 */
export interface RuleFilters {
  /** Filter by stock symbol */
  symbol?: string;
  /** Filter by active status */
  is_active?: boolean;
  /** Limit number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Filter options for querying recommendations
 */
export interface RecommendationFilters {
  /** Filter by status */
  status?: RecommendationStatus;
  /** Filter by stock symbol */
  symbol?: string;
  /** Filter by rule ID */
  rule_id?: string;
  /** Limit number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}
