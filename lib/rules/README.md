# Rule Engine

Complete trading rule evaluation system for automated stock trading decisions.

## Overview

The rule engine evaluates boolean expressions against stock data to generate buy/sell recommendations. It supports technical indicators (RSI, SMA, EMA), stock properties (price, volume), and complex logical conditions.

## Architecture

### Components

1. **Parser** (`parser.ts`)
   - Parses trading expressions into Abstract Syntax Trees (AST)
   - Uses `jsep` library with custom operators
   - Validates syntax and operators
   - Supports: `RSI()`, `SMA()`, `EMA()`, `avgVolume()`, comparison operators, logical operators

2. **Context** (`context.ts`)
   - Creates execution context from historical stock data
   - Provides all available functions and properties
   - Handles indicator calculations
   - Returns current stock values

3. **Evaluator** (`evaluator.ts`)
   - Evaluates AST against stock context
   - Recursively processes expressions
   - Calculates quantity based on type (FIXED, PERCENTAGE, EXPRESSION)
   - Returns evaluation results with metadata

4. **Validators** (`validators.ts`)
   - Validates rule expressions
   - Validates stock symbols
   - Validates quantity configurations
   - Provides helpful error messages

## Expression Language

### Functions

- `RSI(period)` - Relative Strength Index
- `SMA(period)` - Simple Moving Average
- `EMA(period)` - Exponential Moving Average
- `avgVolume(period)` - Average Volume

### Properties

- `close` - Closing price
- `open` - Opening price
- `high` - Highest price
- `low` - Lowest price
- `volume` - Trading volume
- `price` - Alias for close

### Operators

**Comparison:**
- `<` - Less than
- `>` - Greater than
- `<=` - Less than or equal
- `>=` - Greater than or equal
- `==` - Equal
- `!=` - Not equal

**Logical:**
- `AND` - Logical AND
- `OR` - Logical OR
- `NOT` - Logical NOT

### Example Expressions

```javascript
// Simple RSI condition
"RSI(14) < 30"

// Multiple conditions
"RSI(14) < 30 AND volume > avgVolume(20)"

// Moving average crossover
"close > SMA(50) AND close > EMA(20)"

// Complex condition
"(RSI(14) < 30 OR close < SMA(200)) AND volume > avgVolume(20) * 1.5"

// Negation
"NOT (price > 100)"
```

## Quantity Types

### FIXED
Fixed number of shares
```json
{
  "quantity_type": "FIXED",
  "quantity_value": "10"
}
```

### PERCENTAGE
Percentage of available cash
```json
{
  "quantity_type": "PERCENTAGE",
  "quantity_value": "25"
}
```
Example: 25% of $10,000 = $2,500 / price

### EXPRESSION
Dynamic calculation using expression
```json
{
  "quantity_type": "EXPRESSION",
  "quantity_value": "100 / price"
}
```

## API Endpoints

### POST /api/rules
Create a new rule

**Request:**
```json
{
  "name": "Buy AAPL on RSI < 30",
  "description": "Buy when oversold",
  "expression": "RSI(14) < 30 AND volume > avgVolume(20)",
  "action": "BUY",
  "symbol": "AAPL",
  "quantity_type": "PERCENTAGE",
  "quantity_value": "10",
  "is_active": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "rule-uuid",
    "user_id": "user-uuid",
    "name": "Buy AAPL on RSI < 30",
    "expression": "RSI(14) < 30 AND volume > avgVolume(20)",
    "action": "BUY",
    "symbol": "AAPL",
    "quantity_type": "PERCENTAGE",
    "quantity_value": "10",
    "is_active": 1,
    "created_at": 1234567890,
    "updated_at": 1234567890
  }
}
```

### GET /api/rules
List all rules

**Query params:**
- `symbol` - Filter by stock symbol
- `is_active` - Filter by active status
- `limit` - Limit results
- `offset` - Pagination offset

**Response:**
```json
{
  "success": true,
  "data": [...rules],
  "count": 5
}
```

### GET /api/rules/:id
Get a specific rule

### PUT /api/rules/:id
Update a rule

### DELETE /api/rules/:id
Delete a rule

### POST /api/rules/evaluate
Evaluate all active rules

**Query params:**
- `symbol` - Optional: only evaluate for specific symbol

**Response:**
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "id": "rec-uuid",
        "rule_id": "rule-uuid",
        "symbol": "AAPL",
        "action": "BUY",
        "quantity": 10,
        "price": 150.00,
        "total_amount": 1500.00,
        "status": "PENDING",
        "rule": {
          "id": "rule-uuid",
          "name": "Buy AAPL on RSI < 30",
          "expression": "RSI(14) < 30"
        }
      }
    ],
    "stats": {
      "totalRules": 10,
      "triggered": 2,
      "notTriggered": 7,
      "errors": 1
    }
  },
  "message": "Evaluated 10 rules. Created 2 recommendations."
}
```

### GET /api/rules/evaluate
Get evaluation status

**Response:**
```json
{
  "success": true,
  "data": {
    "canEvaluate": true,
    "activeRulesCount": 5,
    "symbolsCount": 3,
    "symbols": ["AAPL", "GOOGL", "MSFT"],
    "cashAvailable": 10000.00
  }
}
```

## Usage Examples

### Creating a Rule

```typescript
import { validateRule } from '@/lib/rules/validators';

// Validate before creating
const validation = await validateRule({
  expression: "RSI(14) < 30",
  symbol: "AAPL",
  quantity_type: "FIXED",
  quantity_value: "10"
});

if (!validation.isValid) {
  console.error(validation.error, validation.details);
  return;
}

// Create via API
const response = await fetch('/api/rules', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: "Buy AAPL on RSI < 30",
    expression: "RSI(14) < 30",
    action: "BUY",
    symbol: "AAPL",
    quantity_type: "FIXED",
    quantity_value: "10"
  })
});
```

### Evaluating Rules

```typescript
// Evaluate all active rules
const response = await fetch('/api/rules/evaluate', {
  method: 'POST'
});

const result = await response.json();

// Process recommendations
for (const rec of result.data.recommendations) {
  console.log(`${rec.action} ${rec.quantity} shares of ${rec.symbol} at $${rec.price}`);
}
```

### Manual Evaluation

```typescript
import { evaluateRule } from '@/lib/rules/evaluator';
import { fetchHistoricalData } from '@/lib/stocks/api-client';

// Fetch data
const historicalData = await fetchHistoricalData('AAPL', { limit: 100 });

// Evaluate rule
const result = evaluateRule(rule, historicalData, userCashAvailable);

if (result.triggered) {
  console.log(`Rule triggered! Buy ${result.quantity} shares at $${result.price}`);
}
```

## Error Handling

The rule engine provides comprehensive error handling:

### Parsing Errors
```typescript
{
  "error": "Invalid function: INVALID",
  "details": "Valid functions are: RSI, SMA, EMA, avgVolume"
}
```

### Validation Errors
```typescript
{
  "error": "Invalid expression",
  "details": "Function RSI requires exactly 1 argument"
}
```

### Evaluation Errors
```typescript
{
  "metadata": {
    "error": "Insufficient data for RSI calculation. Need 15 points, got 10"
  }
}
```

## Performance Considerations

1. **Data Fetching**
   - Rules are grouped by symbol to minimize API calls
   - Historical data is fetched once per symbol
   - Required data days calculated automatically

2. **Caching**
   - Historical data can be cached
   - Consider implementing Redis for production

3. **Rate Limiting**
   - Twelve Data API: 800 calls/day (free tier)
   - Batch evaluation reduces API calls

4. **Edge Runtime**
   - All endpoints use Edge Runtime
   - Compatible with Cloudflare Workers
   - Fast global execution

## Testing

### Unit Tests
```typescript
import { parseExpression, validateExpression } from '@/lib/rules/parser';

// Test parsing
const ast = parseExpression("RSI(14) < 30");
expect(ast.type).toBe('BinaryExpression');

// Test validation
const result = validateExpression("INVALID(14) < 30");
expect(result.isValid).toBe(false);
```

### Integration Tests
```typescript
import { evaluateRule } from '@/lib/rules/evaluator';

// Test evaluation with mock data
const mockData = {
  symbol: 'AAPL',
  values: [...historicalDataPoints]
};

const result = evaluateRule(mockRule, mockData, 10000);
expect(result.triggered).toBe(true);
```

## Security

1. **Authentication**
   - All endpoints require Clerk authentication
   - User ID verified for all operations

2. **Validation**
   - All inputs validated before processing
   - SQL injection prevented via parameterized queries
   - Expression parsing sandboxed (no code execution)

3. **Authorization**
   - Users can only access their own rules
   - Rules scoped by user_id

## Best Practices

1. **Expression Design**
   - Keep expressions simple and readable
   - Use descriptive rule names
   - Test expressions before activating

2. **Quantity Management**
   - Use PERCENTAGE for dynamic allocation
   - Consider market conditions
   - Set reasonable limits

3. **Rule Activation**
   - Start with `is_active: false`
   - Test thoroughly before activating
   - Monitor recommendations regularly

4. **Error Monitoring**
   - Check evaluation stats
   - Review error logs
   - Handle edge cases (insufficient data, API failures)

## Troubleshooting

### "Insufficient data" errors
- Increase historical data fetch limit
- Check if symbol has enough history
- Verify indicator periods are reasonable

### Rules not triggering
- Check rule expression syntax
- Verify is_active = true
- Review stock data availability
- Check evaluation logs

### Performance issues
- Reduce number of active rules
- Optimize expression complexity
- Implement caching
- Consider async evaluation

## Future Enhancements

1. **Additional Indicators**
   - MACD, Bollinger Bands, ATR
   - Custom indicator support

2. **Advanced Features**
   - Multi-timeframe analysis
   - Portfolio-level rules
   - Risk management constraints

3. **Optimization**
   - Result caching
   - Parallel evaluation
   - WebSocket updates

4. **UI Components**
   - Expression builder
   - Visual backtesting
   - Performance analytics
