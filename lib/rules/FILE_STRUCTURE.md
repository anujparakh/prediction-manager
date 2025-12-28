# Rule Engine File Structure

## Core Library Files

### `/lib/rules/parser.ts`
**Purpose:** Expression parsing and AST generation
- Configures jsep with custom operators (AND, OR, NOT)
- Parses trading expressions into Abstract Syntax Trees
- Validates expression syntax
- Converts AST back to readable strings
- Extracts function calls from expressions
- Calculates required data days

**Key Functions:**
- `parseExpression(expr: string)` → AST
- `validateExpression(expr: string)` → ValidationResult
- `astToString(ast)` → string
- `getFunctionsFromExpression(expr)` → Function[]
- `getRequiredDataDays(expr)` → number

**Dependencies:** jsep

---

### `/lib/rules/context.ts`
**Purpose:** Stock function context creation
- Creates execution context from historical data
- Provides current stock values (price, volume, etc.)
- Wraps technical indicator functions
- Validates context completeness

**Key Functions:**
- `createStockContext(historicalData)` → StockContext
- `validateStockContext(context)` → boolean
- `getContextSummary(context)` → Summary

**Context Properties:**
- close, open, high, low, volume, price
- RSI(period), SMA(period), EMA(period), avgVolume(period)

**Dependencies:** lib/stocks/indicators, lib/stocks/types

---

### `/lib/rules/evaluator.ts`
**Purpose:** Rule evaluation engine
- Evaluates rules against stock data
- Recursively processes AST nodes
- Calculates quantities (FIXED, PERCENTAGE, EXPRESSION)
- Handles all operators and edge cases
- Batch evaluation support

**Key Functions:**
- `evaluateRule(rule, stockData, userCash)` → RuleEvaluationResult
- `batchEvaluateRules(rules, stockDataMap, userCash)` → Results[]

**Features:**
- Recursive AST traversal
- Binary/unary operator evaluation
- Function call handling
- Null/undefined safety
- Division by zero protection

**Dependencies:** jsep, parser, context, db/schema, stocks/types

---

### `/lib/rules/validators.ts`
**Purpose:** Rule validation
- Validates expressions before saving
- Validates stock symbols (with API check)
- Validates quantity configurations
- Provides helpful error messages
- Input sanitization

**Key Functions:**
- `validateRuleExpression(expr)` → ValidationResult
- `validateSymbol(symbol)` → ValidationResult
- `validateQuantity(type, value)` → ValidationResult
- `validateRule(data)` → ValidationResult
- `sanitizeSymbol(symbol)` → string
- `sanitizeExpression(expr)` → string

**Dependencies:** parser, stocks/api-client, db/schema

---

### `/lib/rules/index.ts`
**Purpose:** Central export point
- Exports all public APIs from the rule engine
- Provides single import point for consumers
- TypeScript type exports

**Usage:**
```typescript
import * as RuleEngine from '@/lib/rules';
// or
import { evaluateRule, validateExpression } from '@/lib/rules';
```

---

### `/lib/rules/examples.ts`
**Purpose:** Usage examples and demonstrations
- Example 1: Parsing expressions
- Example 2: Validation
- Example 3: Rule evaluation
- Example 4: Complex expressions
- Example 5: Quantity types

**Usage:** Educational reference for developers

---

### `/lib/rules/README.md`
**Purpose:** Complete documentation
- Architecture overview
- Expression language reference
- API documentation
- Usage examples
- Best practices
- Troubleshooting guide
- Security features
- Performance considerations

**Sections:**
- Overview
- Architecture
- Expression Language
- Quantity Types
- API Endpoints
- Technical Architecture
- Security Features
- Usage Examples
- Testing
- Future Enhancements

---

### `/lib/rules/QUICK_REFERENCE.md`
**Purpose:** Quick lookup guide
- Expression syntax cheat sheet
- API endpoint reference
- Code snippets
- Common patterns
- Error messages
- Best practices
- Troubleshooting tips

**Audience:** Developers needing quick answers

---

## API Routes

### `/app/api/rules/route.ts`
**Purpose:** Rules collection endpoints
- GET /api/rules - List all rules with filtering
- POST /api/rules - Create new rule

**Features:**
- Query parameter filtering (symbol, is_active, limit, offset)
- Comprehensive validation
- Clerk authentication
- Edge runtime

**Request/Response:**
```typescript
// POST /api/rules
Request: CreateRuleInput
Response: { success: true, data: Rule }

// GET /api/rules?symbol=AAPL
Response: { success: true, data: Rule[], count: number }
```

---

### `/app/api/rules/[id]/route.ts`
**Purpose:** Individual rule endpoints
- GET /api/rules/:id - Get specific rule
- PUT /api/rules/:id - Update rule
- DELETE /api/rules/:id - Delete rule

**Features:**
- User ownership verification
- Partial updates support
- Validation on updates
- Edge runtime

**Request/Response:**
```typescript
// GET /api/rules/:id
Response: { success: true, data: Rule }

// PUT /api/rules/:id
Request: Partial<UpdateRuleInput>
Response: { success: true, data: Rule }

// DELETE /api/rules/:id
Response: { success: true, message: string }
```

---

### `/app/api/rules/evaluate/route.ts`
**Purpose:** Rule evaluation endpoints
- POST /api/rules/evaluate - Evaluate all active rules
- GET /api/rules/evaluate - Get evaluation status

**Features:**
- Batch stock data fetching (grouped by symbol)
- Automatic recommendation creation
- Evaluation statistics
- Error tracking
- Optional symbol filtering
- Edge runtime

**Request/Response:**
```typescript
// POST /api/rules/evaluate?symbol=AAPL
Response: {
  success: true,
  data: {
    recommendations: Recommendation[],
    stats: {
      totalRules: number,
      triggered: number,
      notTriggered: number,
      errors: number
    },
    fetchErrors?: string[]
  }
}

// GET /api/rules/evaluate
Response: {
  success: true,
  data: {
    canEvaluate: boolean,
    activeRulesCount: number,
    symbolsCount: number,
    symbols: string[],
    cashAvailable: number
  }
}
```

---

## File Dependencies

### Parser → None (only jsep)
### Context → stocks/indicators, stocks/types
### Evaluator → parser, context, db/schema, stocks/types
### Validators → parser, stocks/api-client, db/schema
### Index → parser, context, evaluator, validators
### Examples → All core files

### API Routes → All core files + Clerk + db/queries

---

## Import Graph

```
index.ts
├── parser.ts
├── context.ts
│   └── stocks/indicators.ts
│       └── stocks/types.ts
├── evaluator.ts
│   ├── parser.ts
│   ├── context.ts
│   ├── db/schema.ts
│   └── stocks/types.ts
└── validators.ts
    ├── parser.ts
    ├── stocks/api-client.ts
    └── db/schema.ts

API Routes
├── route.ts
│   ├── validators.ts
│   └── db/queries/rules.ts
├── [id]/route.ts
│   ├── validators.ts
│   └── db/queries/rules.ts
└── evaluate/route.ts
    ├── evaluator.ts
    ├── parser.ts
    ├── db/queries/rules.ts
    ├── db/queries/recommendations.ts
    ├── db/queries/portfolio.ts
    └── stocks/api-client.ts
```

---

## External Dependencies

- **jsep** (^1.4.0) - JavaScript Expression Parser
- **technicalindicators** (^3.1.0) - Technical analysis indicators
- **uuid** - UUID generation
- **@clerk/nextjs** - Authentication
- **Next.js 15** - Edge Runtime

---

## Edge Runtime Compatibility

All files are compatible with:
- Cloudflare Workers
- Vercel Edge Functions
- Next.js Edge Runtime

No Node.js-specific APIs used.

---

## Lines of Code

| File | Lines | Purpose |
|------|-------|---------|
| parser.ts | ~495 | Expression parsing |
| context.ts | ~218 | Stock context |
| evaluator.ts | ~502 | Rule evaluation |
| validators.ts | ~412 | Validation |
| index.ts | ~44 | Exports |
| examples.ts | ~314 | Examples |
| route.ts | ~270 | List/Create API |
| [id]/route.ts | ~337 | CRUD API |
| evaluate/route.ts | ~314 | Evaluation API |
| **Total** | **~2,906** | **Complete system** |

---

## Usage Priority

1. **Start Here:** README.md
2. **Quick Lookup:** QUICK_REFERENCE.md
3. **Code Examples:** examples.ts
4. **API Reference:** This file + README.md
5. **Implementation:** Core library files

---

## Testing Files (To Be Created)

Suggested test files:
- `/lib/rules/__tests__/parser.test.ts`
- `/lib/rules/__tests__/context.test.ts`
- `/lib/rules/__tests__/evaluator.test.ts`
- `/lib/rules/__tests__/validators.test.ts`
- `/app/api/rules/__tests__/route.test.ts`

---

## Development Workflow

1. **Create Rule:**
   - Use validators to check input
   - Call POST /api/rules
   - Save to database

2. **Evaluate Rules:**
   - Call POST /api/rules/evaluate
   - System fetches data
   - Evaluates all active rules
   - Creates recommendations

3. **Monitor:**
   - Check evaluation stats
   - Review recommendations
   - Adjust rules as needed

---

## Security Checklist

✓ Input validation on all endpoints
✓ Clerk authentication required
✓ User ownership verification
✓ SQL injection prevention (parameterized queries)
✓ Expression sandboxing (no eval)
✓ Rate limiting awareness
✓ Error message sanitization (no stack traces in production)

---

## Performance Checklist

✓ Batch processing (grouped by symbol)
✓ Efficient queries (indexed lookups)
✓ Edge runtime (global distribution)
✓ Smart data fetching (only required days)
✓ Minimal data transfer
✓ Caching ready (can be added)

---

## Future Enhancement Ideas

1. More indicators (MACD, Bollinger Bands, ATR)
2. Multi-timeframe analysis
3. Portfolio-level rules
4. Backtesting interface
5. Visual expression builder
6. Scheduled evaluation (cron)
7. WebSocket real-time updates
8. Result caching (Redis)
9. Performance analytics
10. Rule templates library
