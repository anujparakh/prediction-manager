# Database Query Layer

Complete database abstraction layer for the Prediction Manager app using Cloudflare D1.

## Overview

This module provides a type-safe, well-structured database layer with:

- **TypeScript interfaces** matching the D1 database schema
- **D1 client wrapper** with error handling and prepared statements
- **CRUD operations** for all database tables
- **Cloudflare bindings** for accessing D1 from Next.js on Cloudflare Pages

## Directory Structure

```
lib/
├── cloudflare/
│   └── bindings.ts          # Cloudflare D1 binding helpers
└── db/
    ├── index.ts             # Main entry point (exports everything)
    ├── schema.ts            # TypeScript interfaces for all tables
    ├── client.ts            # D1 database client wrapper
    ├── migrations/          # SQL migration files
    │   ├── 0001_initial.sql
    │   ├── 0002_add_rules.sql
    │   └── 0003_add_recommendations.sql
    └── queries/
        ├── portfolio.ts     # Portfolio and cash management
        ├── transactions.ts  # Transaction CRUD operations
        ├── rules.ts         # Rules CRUD operations
        └── recommendations.ts # Recommendations CRUD + execution logic
```

## Usage

### Import

```typescript
// Import everything
import * from '@/lib/db';

// Or import specific modules
import { getPortfolio, updateCash } from '@/lib/db/queries/portfolio';
import { createTransaction } from '@/lib/db/queries/transactions';
import { getRules, createRule } from '@/lib/db/queries/rules';
import { executeRecommendation } from '@/lib/db/queries/recommendations';
```

### Examples

#### Portfolio Management

```typescript
// Get user's complete portfolio
const portfolio = await getPortfolio(userId);
console.log(`Cash: $${portfolio.cash_available}`);
console.log(`Holdings: ${portfolio.holdings.length} stocks`);

// Update cash balance
await updateCash(userId, 1000); // Add $1000
await updateCash(userId, -500); // Subtract $500

// Get specific holding
const appleHolding = await getHolding(userId, 'AAPL');
if (appleHolding) {
  console.log(`${appleHolding.quantity} shares at $${appleHolding.average_price}`);
}
```

#### Transactions

```typescript
// Create a transaction
const transaction = await createTransaction({
  user_id: userId,
  symbol: 'AAPL',
  transaction_type: 'BUY',
  quantity: 10,
  price: 150.00,
  notes: 'Initial purchase'
});

// Get all transactions with filters
const transactions = await getTransactions(userId, {
  symbol: 'AAPL',
  transaction_type: 'BUY',
  start_date: Date.now() - 30 * 24 * 60 * 60 * 1000, // Last 30 days
  limit: 50
});

// Delete a transaction
await deleteTransaction(transactionId, userId);
```

#### Rules

```typescript
// Create a trading rule
const rule = await createRule({
  user_id: userId,
  name: 'Buy AAPL on RSI < 30',
  description: 'Buy when oversold',
  expression: 'rsi < 30 && volume > 1000000',
  action: 'BUY',
  symbol: 'AAPL',
  quantity_type: 'FIXED',
  quantity_value: '10'
});

// Get all active rules
const activeRules = await getAllActiveRules(userId);

// Update a rule
await updateRule(ruleId, userId, {
  expression: 'rsi < 25',
  is_active: false
});

// Toggle rule on/off
await toggleRuleActive(ruleId, userId);

// Delete a rule
await deleteRule(ruleId, userId);
```

#### Recommendations

```typescript
// Get pending recommendations
const pending = await getPendingRecommendations(userId);

// Execute a recommendation (creates transaction and updates cash)
const executed = await executeRecommendation(recommendationId, userId);

// Dismiss a recommendation
await dismissRecommendation(recommendationId, userId);

// Get recommendation statistics
const stats = await getRecommendationStats(userId);
console.log(`Pending: ${stats.pending}, Executed: ${stats.executed}`);

// Bulk execute recommendations
await bulkExecuteRecommendations([rec1Id, rec2Id], userId);
```

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,              -- UUID (matches Clerk user ID)
  email TEXT NOT NULL UNIQUE,
  cash_available REAL DEFAULT 0,
  created_at INTEGER NOT NULL,      -- Unix timestamp
  updated_at INTEGER NOT NULL       -- Unix timestamp
);
```

### Transactions Table

```sql
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,              -- UUID
  user_id TEXT NOT NULL,            -- Foreign key to users.id
  symbol TEXT NOT NULL,             -- Stock symbol (e.g., AAPL)
  transaction_type TEXT NOT NULL,   -- 'BUY' or 'SELL'
  quantity REAL NOT NULL,
  price REAL NOT NULL,
  total_amount REAL NOT NULL,       -- quantity * price
  transaction_date INTEGER NOT NULL, -- Unix timestamp
  notes TEXT,
  recommendation_id TEXT,           -- Optional FK to recommendations.id
  created_at INTEGER NOT NULL
);
```

### Rules Table

```sql
CREATE TABLE rules (
  id TEXT PRIMARY KEY,              -- UUID
  user_id TEXT NOT NULL,            -- Foreign key to users.id
  name TEXT NOT NULL,
  description TEXT,
  expression TEXT NOT NULL,         -- Boolean expression
  action TEXT NOT NULL,             -- 'BUY' or 'SELL'
  symbol TEXT NOT NULL,
  quantity_type TEXT NOT NULL,      -- 'FIXED', 'PERCENTAGE', 'EXPRESSION'
  quantity_value TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,      -- 1 = active, 0 = inactive
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

### Recommendations Table

```sql
CREATE TABLE recommendations (
  id TEXT PRIMARY KEY,              -- UUID
  user_id TEXT NOT NULL,            -- Foreign key to users.id
  rule_id TEXT NOT NULL,            -- Foreign key to rules.id
  symbol TEXT NOT NULL,
  action TEXT NOT NULL,             -- 'BUY' or 'SELL'
  quantity REAL NOT NULL,
  price REAL NOT NULL,
  total_amount REAL NOT NULL,
  status TEXT NOT NULL,             -- 'PENDING', 'EXECUTED', 'DISMISSED'
  rule_name TEXT NOT NULL,
  rule_expression TEXT NOT NULL,
  evaluated_at INTEGER NOT NULL,
  executed_at INTEGER,
  metadata TEXT                     -- Optional JSON metadata
);
```

## Error Handling

All database functions throw `DatabaseError` with:
- `message`: Error description
- `code`: Error code (e.g., 'USER_NOT_FOUND', 'INSUFFICIENT_FUNDS')
- `originalError`: Original error object

```typescript
try {
  await updateCash(userId, -1000000);
} catch (error) {
  if (error instanceof DatabaseError) {
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error('Not enough cash!');
    }
  }
}
```

## Key Features

### Portfolio Calculations

The `getPortfolio()` function calculates holdings from transactions using SQL aggregation:

- **Net quantity**: `SUM(BUY quantity) - SUM(SELL quantity)`
- **Average price**: `SUM(total_amounts) / SUM(quantities)`
- **Total invested**: `SUM(BUY amounts) - SUM(SELL amounts)`

### Recommendation Execution

When executing a recommendation (`executeRecommendation()`):

1. Creates a transaction with the recommendation details
2. Updates cash balance (subtract for BUY, add for SELL)
3. Updates recommendation status to EXECUTED
4. Sets executed_at timestamp
5. Links transaction to recommendation via recommendation_id

### Type Safety

All functions use TypeScript interfaces for:
- Input validation
- Return types
- Filter options
- Error codes

### Prepared Statements

All queries use D1 prepared statements to prevent SQL injection:

```typescript
// Safe - uses prepared statement
await queryD1('SELECT * FROM users WHERE id = ?', [userId]);

// Never concatenate SQL strings!
```

## Cloudflare D1 Notes

- D1 uses SQLite syntax
- Boolean values stored as INTEGER (0 or 1)
- UUIDs stored as TEXT
- Timestamps stored as INTEGER (Unix milliseconds)
- Foreign keys supported with ON DELETE CASCADE
- Indexes created for common query patterns

## Running Migrations

```bash
# Apply migrations to local D1 database
wrangler d1 migrations apply prediction-manager-db --local

# Apply migrations to production
wrangler d1 migrations apply prediction-manager-db
```

## Testing

All database functions can be tested using the local D1 database:

```bash
# Start local D1 database
npm run pages:dev

# Run your tests against the local database
```
