# Stock Prediction Manager - Implementation Plan

## Architecture Overview

**Single Next.js Application on Cloudflare**
- Next.js 14+ (App Router) with TypeScript
- Deployed to Cloudflare Pages using `@cloudflare/next-on-pages`
- API routes run as Cloudflare Workers (edge runtime)
- Cloudflare D1 (SQLite) for database
- Clerk for authentication
- shadcn/ui for UI components

## Tech Stack Summary

| Component | Technology |
|-----------|-----------|
| Frontend Framework | Next.js 14+ (App Router) + TypeScript |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui (Radix UI primitives) |
| Authentication | Clerk |
| Backend Runtime | Cloudflare Workers (Edge) |
| Database | Cloudflare D1 (SQLite) |
| Stock Data API | Twelve Data (800 calls/day) or yfinance (unlimited, unofficial) |
| Expression Parser | jsep (custom AST evaluator) |
| Technical Indicators | technicalindicators npm package |
| Form Handling | react-hook-form + zod |
| Code Quality | Prettier + ESLint |

## Database Schema

### Tables

**users**
- `id` (TEXT, PK) - Clerk user ID
- `email` (TEXT, unique)
- `cash_available` (REAL) - Available cash for trading
- `created_at`, `updated_at` (INTEGER)

**transactions** (source of truth)
- `id` (TEXT, PK) - UUID
- `user_id` (TEXT, FK → users)
- `symbol` (TEXT) - Stock ticker
- `transaction_type` (TEXT) - 'BUY' or 'SELL'
- `quantity` (REAL) - Shares bought/sold (supports fractional)
- `price` (REAL) - Price per share
- `total_amount` (REAL) - quantity × price
- `transaction_date` (INTEGER) - When trade was executed
- `notes` (TEXT) - Optional notes (e.g., "From recommendation #123")
- `recommendation_id` (TEXT, nullable, FK → recommendations)
- `created_at` (INTEGER)

**rules**
- `id` (TEXT, PK) - UUID
- `user_id` (TEXT, FK → users)
- `name` (TEXT) - Rule name
- `description` (TEXT) - Optional description
- `expression` (TEXT) - JSON AST of rule conditions
- `action` (TEXT) - 'BUY' or 'SELL'
- `symbol` (TEXT) - Stock ticker this rule applies to
- `quantity_type` (TEXT) - 'FIXED', 'PERCENTAGE', 'EXPRESSION'
- `quantity_value` (TEXT) - Amount or expression to calculate
- `is_active` (INTEGER) - 1 = active, 0 = inactive
- `created_at`, `updated_at` (INTEGER)

~~**stock_quotes** - REMOVED (no caching, fetch on-demand)~~

~~**stock_indicators** - REMOVED (calculate on-demand)~~

**recommendations** (generated from rule evaluations)
- `id` (TEXT, PK)
- `user_id`, `rule_id` (TEXT, FKs)
- `symbol` (TEXT) - Stock ticker
- `action` (TEXT) - 'BUY' or 'SELL'
- `quantity` (REAL) - Recommended quantity
- `price` (REAL) - Stock price at evaluation
- `total_amount` (REAL) - quantity × price
- `status` (TEXT) - 'PENDING', 'EXECUTED', 'DISMISSED'
- `rule_name` (TEXT) - Name of rule that triggered
- `rule_expression` (TEXT) - Expression that evaluated true
- `evaluated_at` (INTEGER) - When rule was evaluated
- `executed_at` (INTEGER, nullable) - When marked as done
- `metadata` (TEXT) - JSON with indicator values, etc.

## Key Implementation Decisions

### 1. Expression Language for Rules
**Choice: jsep (parser) + Custom Evaluator**

Users can write expressions like:
```
(RSI(14) < 30 AND volume > avgVolume(20)) OR close < SMA(50)
```

**Available functions:**
- `RSI(period)` - Relative Strength Index
- `SMA(period)` - Simple Moving Average
- `EMA(period)` - Exponential Moving Average
- `volume`, `avgVolume(period)`
- `close`, `open`, `high`, `low`, `price`

**Operators:** `<`, `>`, `<=`, `>=`, `==`, `!=`, `AND`, `OR`, `NOT`

**Why jsep:** Parses to AST (prevents code injection), lightweight, flexible

### 2. Technical Indicators
**Choice: `technicalindicators` npm package**
- Supports RSI, SMA, EMA, MACD, Bollinger Bands
- TypeScript support
- Lightweight enough for edge runtime

### 3. Stock Data Strategy
**On-demand fetching with aggressive caching**
- Cache stock quotes for 15 minutes (matches free API delay)
- Cache calculated indicators daily
- Store in D1 to minimize API calls
- Alpha Vantage free tier: 25 requests/day

### 4. Cloudflare D1 Access Pattern
```typescript
import { getRequestContext } from '@cloudflare/next-on-pages';

export function getD1Database(): D1Database {
  return getRequestContext().env.DB;
}
```

All API routes use edge runtime: `export const runtime = 'edge';`

## Project Structure

```
prediction-manager/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   └── sign-up/[[...sign-up]]/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx                    # Protected layout
│   │   ├── page.tsx                      # Main dashboard
│   │   ├── portfolio/page.tsx            # View holdings & cash
│   │   ├── transactions/
│   │   │   ├── page.tsx                  # Transaction history
│   │   │   └── new/page.tsx              # Manual transaction entry
│   │   ├── rules/
│   │   │   ├── page.tsx                  # List rules
│   │   │   ├── new/page.tsx              # Create rule
│   │   │   └── [id]/edit/page.tsx        # Edit rule
│   │   └── recommendations/page.tsx      # All recommendations (history)
│   ├── api/
│   │   ├── portfolio/route.ts            # GET cash & calculated holdings
│   │   ├── transactions/
│   │   │   ├── route.ts                  # GET/POST transactions
│   │   │   └── [id]/route.ts             # DELETE transaction
│   │   ├── recommendations/
│   │   │   ├── route.ts                  # GET recommendations
│   │   │   └── [id]/route.ts             # PATCH status, DELETE
│   │   ├── rules/
│   │   │   ├── route.ts                  # CRUD rules
│   │   │   ├── [id]/route.ts
│   │   │   └── evaluate/route.ts         # Create recommendations
│   │   ├── stocks/
│   │   │   ├── quote/route.ts
│   │   │   ├── historical/route.ts
│   │   │   └── indicators/route.ts
│   │   └── webhooks/clerk/route.ts
│   ├── layout.tsx                        # Clerk provider
│   ├── globals.css
│   └── middleware.ts                     # Auth protection
├── components/
│   ├── ui/                               # shadcn/ui components
│   ├── dashboard/
│   │   ├── recommendation-card.tsx
│   │   └── portfolio-summary.tsx
│   ├── rules/
│   │   ├── rule-builder.tsx              # Visual builder
│   │   ├── condition-group.tsx           # AND/OR groups
│   │   └── condition-input.tsx           # Single condition
│   └── portfolio/
│       ├── holdings-table.tsx
│       └── add-holding-dialog.tsx
├── lib/
│   ├── db/
│   │   ├── client.ts                     # D1 wrapper
│   │   ├── schema.ts                     # Type definitions
│   │   ├── migrations/
│   │   │   ├── 0001_initial.sql
│   │   │   ├── 0002_add_rules.sql
│   │   │   └── 0003_add_recommendations.sql
│   │   └── queries/
│   │       ├── portfolio.ts              # Calculate holdings from transactions
│   │       ├── transactions.ts           # Transaction CRUD
│   │       ├── recommendations.ts        # Recommendation CRUD
│   │       └── rules.ts
│   ├── rules/
│   │   ├── parser.ts                     # jsep expression parser
│   │   ├── evaluator.ts                  # AST evaluation
│   │   └── validators.ts                 # Expression validation
│   ├── stocks/
│   │   ├── api-client.ts                 # Alpha Vantage client
│   │   ├── indicators.ts                 # Technical indicators
│   │   └── cache.ts                      # Caching strategy
│   └── cloudflare/
│       └── bindings.ts                   # D1 access helper
├── types/
│   └── cloudflare.d.ts                   # Cloudflare env types
├── next.config.js                        # Cloudflare adapter config
├── wrangler.toml                         # D1 bindings
├── middleware.ts                         # Clerk middleware
├── prettier.config.js
└── components.json                       # shadcn/ui config
```

## Implementation Phases

### Phase 1: Foundation Setup (Week 1)

**Goal:** Bootstrap project with all dependencies and configurations

1. Initialize Next.js project
   ```bash
   npx create-next-app@latest prediction-manager --typescript --tailwind --app
   ```

2. Install core dependencies
   ```bash
   npm install @cloudflare/next-on-pages @clerk/nextjs
   npm install jsep technicalindicators
   npm install react-hook-form zod @hookform/resolvers
   npm install date-fns uuid
   npm install -D wrangler @types/uuid prettier
   ```

3. Setup shadcn/ui
   ```bash
   npx shadcn-ui@latest init
   npx shadcn-ui@latest add button input select card table dialog form
   npx shadcn-ui@latest add dropdown-menu label textarea badge
   ```

4. Configure Cloudflare adapter in `next.config.js`
5. Create `wrangler.toml` with D1 binding
6. Setup TypeScript types for Cloudflare bindings (`types/cloudflare.d.ts`)
7. Configure Prettier and ESLint
8. Setup Clerk (create app, add env vars, configure middleware)

**Deliverables:**
- Working Next.js app with TypeScript
- Cloudflare adapter configured
- Clerk authentication working locally
- shadcn/ui installed and themed
- Prettier formatting configured

**Critical Files:**
- `next.config.js`
- `wrangler.toml`
- `middleware.ts` (Clerk)
- `app/layout.tsx` (ClerkProvider)
- `.env.local`

---

### Phase 2: Database Layer (Week 1-2)

**Goal:** Create D1 database with schema and query layer

1. Create D1 database
   ```bash
   wrangler d1 create prediction-manager-db
   ```

2. Write migrations
   - `lib/db/migrations/0001_initial.sql` (users, transactions)
   - `lib/db/migrations/0002_add_rules.sql`
   - `lib/db/migrations/0003_add_recommendations.sql`

3. Run migrations
   ```bash
   wrangler d1 execute prediction-manager-db --file=./lib/db/migrations/0001_initial.sql --local
   ```

4. Create D1 client wrapper (`lib/db/client.ts`)
   - Helper functions: `queryD1`, `executeD1`
   - Uses `getRequestContext().env.DB`

5. Create TypeScript schema types (`lib/db/schema.ts`)
   - Interfaces for all tables

6. Implement query modules
   - `lib/db/queries/portfolio.ts` - Portfolio CRUD
   - `lib/db/queries/rules.ts` - Rules CRUD
   - `lib/db/queries/stocks.ts` - Stock cache queries

7. Create Clerk webhook to sync users
   - `app/api/webhooks/clerk/route.ts`
   - Handle `user.created` event

**Deliverables:**
- D1 database created locally and ready for production
- All migrations written and tested
- Type-safe query layer
- User sync working with Clerk

**Critical Files:**
- `lib/db/client.ts`
- `lib/db/schema.ts`
- `lib/db/migrations/*.sql`
- `lib/db/queries/*.ts`
- `app/api/webhooks/clerk/route.ts`

---

### Phase 3: Stock Data Integration (Week 2)

**Goal:** Fetch stock data on-demand from Twelve Data or yfinance

1. Choose stock data provider:
   - **Option A: Twelve Data** (recommended for production)
     - Sign up for API key (free: 800 calls/day)
     - Add API key to `.env.local`
   - **Option B: yfinance** (Python library, unlimited but unofficial)
     - No API key needed
     - May need to create a thin Python proxy API

2. Create stock API client (`lib/stocks/api-client.ts`)
   - `fetchQuote(symbol)` - Get current quote
   - `fetchHistoricalData(symbol, from, to, limit)` - Get daily data
   - Rate limiting logic (track calls per day)
   - Error handling with retries
   - **No caching** - fetch fresh data every time

3. Create technical indicators wrapper (`lib/stocks/indicators.ts`)
   - `calculateRSI(historicalData, period)` - Calculate from data
   - `calculateSMA(historicalData, period)`
   - `calculateEMA(historicalData, period)`
   - Uses `technicalindicators` npm package
   - **Calculates on-the-fly** from fetched historical data

4. Build stock API routes
   - `app/api/stocks/quote/route.ts` - GET current quote
   - `app/api/stocks/historical/route.ts` - GET historical data
   - `app/api/stocks/indicators/route.ts` - POST calculate indicators from data

5. Test with real stock symbols (AAPL, GOOGL, etc.)

**Deliverables:**
- Working stock data fetching (on-demand, no cache)
- Technical indicators calculation from historical data
- API routes returning fresh stock data
- Rate limiting to stay under free tier

**Critical Files:**
- `lib/stocks/api-client.ts`
- `lib/stocks/indicators.ts`
- `app/api/stocks/quote/route.ts`

---

### Phase 4: Rule Engine (Week 2-3)

**Goal:** Build expression parser and evaluator

1. Install and configure jsep
   ```typescript
   import jsep from 'jsep';
   jsep.addBinaryOp('AND', 10);
   jsep.addBinaryOp('OR', 10);
   jsep.addUnaryOp('NOT');
   ```

2. Create expression parser (`lib/rules/parser.ts`)
   - `parseExpression(expr: string)` → AST
   - Validate syntax
   - Return AST or throw error

3. Build rule evaluator (`lib/rules/evaluator.ts`)
   - `evaluateRule(rule: Rule, symbol: string)` → boolean
   - Recursive AST traversal
   - Resolve stock functions (RSI, SMA, etc.)
   - Handle operators (<, >, AND, OR, NOT)
   - Return true/false if rule triggered

4. Implement stock function context
   - Fetch historical data for symbol
   - Calculate required indicators
   - Create context object with all available functions

5. Add quantity calculation
   - Fixed: "10" → 10 shares
   - Percentage: "10%" → calculate from cash/holdings
   - Expression: "cash / price" → evaluate expression

6. Create validation (`lib/rules/validators.ts`)
   - Validate expression syntax before saving
   - Check for valid stock symbols
   - Validate quantity expressions

7. Build rules API routes
   - `app/api/rules/route.ts` - GET/POST rules
   - `app/api/rules/[id]/route.ts` - GET/PUT/DELETE
   - `app/api/rules/evaluate/route.ts` - Evaluate all rules

8. Test with example rules
   ```
   RSI(14) < 30
   (RSI(14) < 30 AND volume > avgVolume(20)) OR close < SMA(50)
   ```

**Deliverables:**
- Working expression parser (jsep + custom evaluator)
- Rule evaluation returning buy/sell recommendations
- Support for complex AND/OR/NOT logic
- Quantity calculation (fixed, %, expression)
- API routes for rule CRUD and evaluation

**Critical Files:**
- `lib/rules/parser.ts`
- `lib/rules/evaluator.ts`
- `lib/rules/validators.ts`
- `app/api/rules/route.ts`
- `app/api/rules/evaluate/route.ts`

---

### Phase 5: Portfolio & Transactions UI (Week 3)

**Goal:** Build UI for transactions and portfolio view

1. Create protected dashboard layout
   - `app/(dashboard)/layout.tsx`
   - Navigation sidebar/header
   - Clerk user button

2. Build portfolio page (`app/(dashboard)/portfolio/page.tsx`)
   - Display current cash
   - Show holdings table (calculated from transactions)
   - Calculate total portfolio value
   - Show profit/loss per holding
   - Link to transaction history

3. Create transaction history page (`app/(dashboard)/transactions/page.tsx`)
   - Table of all transactions (BUY/SELL)
   - Filter by symbol, date range
   - Delete transaction (recalculates holdings)

4. Create manual transaction entry (`app/(dashboard)/transactions/new/page.tsx`)
   - Form to add historical transactions
   - Fields: symbol, type (BUY/SELL), quantity, price, date
   - Auto-updates cash balance

5. Create components
   - `components/portfolio/holdings-table.tsx` - Calculated holdings
   - `components/portfolio/cash-display.tsx` - Current cash
   - `components/transactions/transaction-history.tsx` - Transaction list
   - `components/transactions/add-transaction-dialog.tsx` - Manual entry

6. Implement API routes
   - `app/api/portfolio/route.ts` - GET portfolio (calculated)
   - `app/api/transactions/route.ts` - GET/POST transactions
   - `app/api/transactions/[id]/route.ts` - DELETE

7. Holdings calculation logic (`lib/db/queries/portfolio.ts`)
   ```sql
   SELECT
     symbol,
     SUM(CASE WHEN transaction_type = 'BUY' THEN quantity ELSE -quantity END) as total_quantity,
     -- Calculate average cost
     SUM(CASE WHEN transaction_type = 'BUY' THEN total_amount ELSE 0 END) /
     SUM(CASE WHEN transaction_type = 'BUY' THEN quantity ELSE 0 END) as avg_cost
   FROM transactions
   WHERE user_id = ?
   GROUP BY symbol
   HAVING total_quantity > 0
   ```

**Deliverables:**
- Portfolio view with calculated holdings
- Transaction history page
- Manual transaction entry
- Auto-updating cash balance
- P&L tracking per holding

**Critical Files:**
- `app/(dashboard)/portfolio/page.tsx`
- `app/(dashboard)/transactions/page.tsx`
- `lib/db/queries/portfolio.ts` (holdings calculation)
- `lib/db/queries/transactions.ts`
- `app/api/transactions/route.ts`

---

### Phase 6: Rules Builder UI (Week 3-4)

**Goal:** Build visual rule builder interface

1. Create rules list page (`app/(dashboard)/rules/page.tsx`)
   - Table of all rules
   - Toggle active/inactive
   - Edit/delete actions

2. Build rule builder page (`app/(dashboard)/rules/new/page.tsx`)
   - Stock symbol selector
   - Action selector (BUY/SELL)
   - Visual condition builder
   - Quantity input (fixed/percentage/expression)
   - Save rule

3. Create rule builder components
   - `components/rules/rule-builder.tsx` - Main builder
   - `components/rules/condition-group.tsx` - AND/OR groups
   - `components/rules/condition-input.tsx` - Single condition
     - Indicator selector (RSI, SMA, etc.)
     - Operator selector (<, >, etc.)
     - Value input
   - `components/rules/rule-preview.tsx` - Show final expression

4. Build rule edit page (`app/(dashboard)/rules/[id]/edit/page.tsx`)
   - Pre-populate form with existing rule
   - Same UI as create page

5. Wire up to rules API
6. Add expression validation before save

**Deliverables:**
- Visual rule builder (no code writing needed)
- Support for nested AND/OR conditions
- Rule preview showing final expression
- Edit existing rules
- Toggle rules active/inactive

**Critical Files:**
- `app/(dashboard)/rules/page.tsx`
- `app/(dashboard)/rules/new/page.tsx`
- `components/rules/rule-builder.tsx`
- `components/rules/condition-group.tsx`

---

### Phase 7: Dashboard & Recommendations (Week 4)

**Goal:** Display recommendations with "Mark as Done" workflow

1. Implement evaluation logic in API
   - `app/api/rules/evaluate/route.ts`
   - Fetch all active rules for user
   - For each rule:
     - Fetch required stock data
     - Evaluate expression
     - Calculate quantity if triggered
   - Create recommendation records with `status='PENDING'`
   - Return recommendations array

2. Create recommendations API
   - `app/api/recommendations/route.ts` - GET recommendations
   - `app/api/recommendations/[id]/route.ts` - PATCH/DELETE
   - **PATCH with status='EXECUTED':**
     - Create transaction record
     - Update cash balance (buy: subtract, sell: add)
     - Set recommendation.executed_at
     - Return updated recommendation

3. Create main dashboard (`app/(dashboard)/page.tsx`)
   - "Today's Recommendations" section (PENDING only)
   - Portfolio summary (total value, cash, holdings)
   - Quick stats
   - "Evaluate Rules" button to run evaluation

4. Build dashboard components
   - `components/dashboard/recommendation-card.tsx`
     - Stock symbol, action (BUY/SELL)
     - Quantity, price, total cost
     - Which rule triggered
     - **"Mark as Done" button** (status → EXECUTED)
     - **"Dismiss" button** (status → DISMISSED)
   - `components/dashboard/portfolio-summary.tsx`
     - Total portfolio value
     - Cash available
     - Holdings count
     - Link to full portfolio

5. Create recommendations history page (`app/(dashboard)/recommendations/page.tsx`)
   - All recommendations (PENDING, EXECUTED, DISMISSED)
   - Filter by status, date, symbol
   - Show execution date for completed ones

6. Add loading states (Suspense, skeletons)
7. Add empty states (no rules, no recommendations)

**Mark as Done Workflow:**
```
User clicks "Mark as Done" on recommendation
  ↓
PATCH /api/recommendations/[id] { status: 'EXECUTED' }
  ↓
Backend:
  1. Creates transaction with recommendation details
  2. Updates user.cash_available (buy: -, sell: +)
  3. Sets recommendation.status = 'EXECUTED'
  4. Sets recommendation.executed_at = now()
  ↓
Frontend: Recommendation disappears from pending, shows in history
Holdings automatically recalculated on next portfolio view
```

**Deliverables:**
- Working dashboard with recommendations
- "Mark as Done" creates transaction + updates cash
- Recommendations history page
- Clear buy/sell actions
- Dismiss unwanted recommendations

**Critical Files:**
- `app/(dashboard)/page.tsx`
- `app/(dashboard)/recommendations/page.tsx`
- `components/dashboard/recommendation-card.tsx`
- `app/api/rules/evaluate/route.ts`
- `app/api/recommendations/[id]/route.ts` (mark as done logic)
- `lib/db/queries/recommendations.ts`

---

### Phase 8: Polish & Testing (Week 4-5)

**Goal:** Production-ready quality

1. **Error Handling**
   - Add error boundaries
   - Toast notifications for user feedback
   - Proper API error responses (401, 404, 500)
   - Handle stock API failures gracefully

2. **Loading States**
   - Skeleton loaders with shadcn/ui
   - Suspense boundaries for async components
   - Loading spinners for actions

3. **Responsive Design**
   - Mobile-friendly layouts
   - Touch-friendly buttons
   - Responsive tables (mobile: cards)

4. **Validation**
   - Client-side form validation (zod)
   - Server-side validation
   - Helpful error messages

5. **Testing**
   - Unit tests for rule evaluator
   - Test with various stock symbols
   - Test edge cases (market closed, API errors)

6. **Documentation**
   - README with setup instructions
   - .env.example with all required vars
   - Comments in complex code (parser, evaluator)

**Deliverables:**
- Polished, professional UI
- Comprehensive error handling
- Mobile-responsive
- Basic test coverage

---

### Phase 9: Deployment (Week 5)

**Goal:** Deploy to Cloudflare Pages

1. **Cloudflare Pages Setup**
   - Connect GitHub repository
   - Configure build command: `npm run build`
   - Output directory: `.vercel/output/static`
   - Node version: 18+

2. **Environment Variables**
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `ALPHA_VANTAGE_API_KEY`
   - Database ID from wrangler.toml

3. **Production D1 Database**
   ```bash
   wrangler d1 create prediction-manager-db-prod
   wrangler d1 execute prediction-manager-db-prod --file=./lib/db/migrations/0001_initial.sql
   wrangler d1 execute prediction-manager-db-prod --file=./lib/db/migrations/0002_add_rules.sql
   wrangler d1 execute prediction-manager-db-prod --file=./lib/db/migrations/0003_add_stock_cache.sql
   ```

4. **Clerk Production Setup**
   - Create production instance
   - Configure webhook URLs
   - Update environment variables

5. **Deploy**
   - Push to GitHub
   - Cloudflare Pages auto-deploys
   - Verify all functionality

6. **Monitor**
   - Check Cloudflare Analytics
   - Monitor error logs
   - Test all features in production

**Deliverables:**
- Live app on Cloudflare Pages
- Production database
- All features working
- Monitoring in place

---

## Critical Configuration Files

### `next.config.js`
```javascript
const { setupDevPlatform } = require('@cloudflare/next-on-pages/next-dev');

if (process.env.NODE_ENV === 'development') {
  setupDevPlatform();
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true, // Required for Cloudflare
  },
};

module.exports = nextConfig;
```

### `wrangler.toml`
```toml
name = "prediction-manager"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "prediction-manager-db"
database_id = "YOUR_DATABASE_ID"
```

### `middleware.ts` (Clerk)
```typescript
import { authMiddleware } from '@clerk/nextjs';

export default authMiddleware({
  publicRoutes: ['/sign-in(.*)', '/sign-up(.*)'],
});

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
```

### `.env.local`
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
ALPHA_VANTAGE_API_KEY=your_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Important Limitations & Gotchas

### Edge Runtime Constraints
- No Node.js APIs (fs, path, crypto) - use Web APIs only
- 1MB compressed bundle limit - keep dependencies minimal
- 50ms CPU time on free plan - optimize rule evaluation
- Must specify `export const runtime = 'edge';` in all API routes

### D1 Database
- Eventually consistent (write may not be immediately readable)
- Use transactions where possible
- No traditional ORMs (Prisma won't work)

### Stock API Limits
- Alpha Vantage free: 25 requests/day
- **Must cache aggressively** to stay under limit
- 15-minute delay on free tier (acceptable for daily predictions)
- Consider upgrading or multiple API keys for production

### Next.js on Cloudflare
- Image optimization doesn't work - set `unoptimized: true`
- Some Next.js features unavailable (ISR with long timers, etc.)
- Use Server Components and Server Actions for data fetching

### Security
- Validate all rule expressions (prevent code injection via AST parsing)
- Always filter by `userId` from Clerk
- Never expose API keys to client
- Rate limit rule evaluations per user

---

## Success Criteria

✅ User can sign up and log in via Clerk
✅ User can manually add transactions (BUY/SELL) with price and date
✅ Holdings are automatically calculated from transaction history
✅ Cash balance auto-updates when transactions are added
✅ User can create rules using visual builder (no code)
✅ Rules support complex logic: `(RSI < 30 AND volume > avg) OR price < SMA`
✅ Dashboard shows daily buy/sell recommendations (PENDING)
✅ User can "Mark as Done" on recommendations → creates transaction → updates cash
✅ Transaction history page shows all buys/sells
✅ Portfolio page shows calculated holdings with P&L
✅ Recommendations history page shows all past recommendations
✅ Stock data fetched on-demand from Twelve Data or yfinance (no caching)
✅ Technical indicators calculated (RSI, SMA, EMA)
✅ All pages responsive and mobile-friendly
✅ Deployed to Cloudflare Pages with production database

---

## Complete User Workflow

**Setup (One-time):**
1. User signs up / logs in via Clerk
2. User adds starting cash amount
3. User manually enters existing holdings as transactions (if any)
   - Example: "Bought 50 AAPL @ $150 on 2024-01-15"

**Creating Rules:**
1. User goes to Rules page → "New Rule"
2. User builds rule visually:
   - Select stock symbol (AAPL)
   - Select action (BUY or SELL)
   - Build conditions: `(RSI(14) < 30 AND volume > avgVolume(20)) OR close < SMA(50)`
   - Set quantity (10 shares, or "10%", or "cash / price")
3. Rule is saved as active

**Daily Workflow:**
1. User opens dashboard
2. User clicks "Evaluate Rules" button
3. System fetches stock data and evaluates all active rules
4. Dashboard shows PENDING recommendations:
   - "BUY 10 shares of AAPL @ $150 (Total: $1,500)"
   - "From rule: RSI Dip Strategy"
5. User executes trade in their brokerage account
6. User clicks "Mark as Done" in the app
7. System automatically:
   - Creates transaction record
   - Updates cash balance (-$1,500)
   - Marks recommendation as EXECUTED
   - Recalculates holdings (now has 10 AAPL shares)

**Portfolio Management:**
1. User views Portfolio page → sees calculated holdings
2. User views Transactions page → sees all buy/sell history
3. User can manually add transactions for external trades
4. System calculates P&L based on current stock prices vs avg cost

---

## Cloudflare Free Tier Analysis

**What's Free:**
- ✅ **Cloudflare Pages:** Unlimited static requests, 500 builds/month
- ✅ **Cloudflare Workers:** 100,000 requests/day, 10ms CPU time per request
- ✅ **Cloudflare D1:** 5GB storage, 5M rows read/day, 100k rows written/day

**Estimated Usage (Single User, Daily Evaluation):**
- **Workers:** ~50 requests/day (dashboard loads, rule evaluations, API calls)
- **D1 Reads:** ~500 rows/day (holdings, rules, recommendations)
- **D1 Writes:** ~20 rows/day (transactions, recommendations)
- **Storage:** <10MB for user data (no stock cache)
- **Stock API:** ~50 calls/day (Twelve Data: 800/day limit)
- **Verdict:** Completely free ✅

**Estimated Usage (10 Active Users):**
- **Workers:** ~500 requests/day
- **D1 Reads:** ~5,000 rows/day
- **D1 Writes:** ~200 rows/day
- **Stock API:** ~500 calls/day (Twelve Data: 800/day limit)
- **Verdict:** Still completely free ✅

**Stock API Limits:**
- ✅ **Twelve Data (Recommended):** Free tier = 800 API calls/day
  - **Single user:** ~50 calls/day for daily evaluations ✅ Free
  - **10 users:** ~500 calls/day ✅ Still free
  - **If needed:** Paid plan $79/month = unlimited calls
- ✅ **yfinance (Alternative):** Unlimited (unofficial scraper)
  - ⚠️ Risk: Could break if Yahoo changes website
  - No API key, no cost
  - Good for personal use, risky for production

**For 100+ users:**
- May need Cloudflare Workers paid plan ($5/month for 10M requests)
- May need paid Twelve Data ($79/month for unlimited) or implement request queuing

**Recommendation:** Use Twelve Data free tier (800/day) for production reliability, or yfinance for personal use with unlimited calls but higher risk.

---

## Next Steps After Plan Approval

1. **Phase 1: Foundation** - Setup Next.js, Cloudflare, Clerk, shadcn/ui
2. **Phase 2: Database** - Create D1 schema and query layer (transactions, recommendations)
3. **Phase 3: Stock Data** - Integrate Alpha Vantage with caching
4. **Phase 4: Rule Engine** - Build expression parser and evaluator (most complex)
5. **Phase 5: Transactions UI** - Portfolio, transaction history, manual entry
6. **Phase 6: Rules Builder UI** - Visual rule builder (most complex UI)
7. **Phase 7: Dashboard** - Recommendations with "Mark as Done" workflow
8. **Phase 8: Polish** - Error handling, loading states, responsive design
9. **Phase 9: Deploy** - Production-ready and deploy to Cloudflare

**Estimated Timeline:** 4-5 weeks for full implementation

**Most Complex Components:**
1. Rule builder UI (visual condition builder with nested AND/OR)
2. Rule evaluator (AST traversal with stock function resolution)
3. "Mark as Done" workflow (recommendation → transaction → cash update → holdings recalc)
4. Holdings calculation from transaction history (SQL aggregation)
5. On-demand stock data fetching with rate limiting
