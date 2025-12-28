# Rule Engine Quick Reference

## Expression Syntax

### Functions
```javascript
RSI(14)          // Relative Strength Index, period 14
SMA(50)          // Simple Moving Average, period 50
EMA(20)          // Exponential Moving Average, period 20
avgVolume(20)    // Average Volume, period 20
```

### Properties
```javascript
close            // Closing price
open             // Opening price
high             // Highest price
low              // Lowest price
volume           // Trading volume
price            // Alias for close
```

### Operators
```javascript
// Comparison
<  >  <=  >=  ==  !=

// Logical
AND  OR  NOT
```

### Example Expressions
```javascript
// Simple
"RSI(14) < 30"

// Multiple conditions
"RSI(14) < 30 AND volume > avgVolume(20)"

// Moving average crossover
"close > SMA(50) AND close > EMA(20)"

// Complex
"(RSI(14) < 30 OR close < SMA(200)) AND volume > avgVolume(20) * 1.5"

// With NOT
"NOT (price > 100) AND RSI(14) < 40"
```

## API Quick Reference

### Create Rule
```bash
POST /api/rules
{
  "name": "Buy AAPL on RSI < 30",
  "expression": "RSI(14) < 30",
  "action": "BUY",
  "symbol": "AAPL",
  "quantity_type": "FIXED",
  "quantity_value": "10"
}
```

### List Rules
```bash
GET /api/rules?symbol=AAPL&is_active=true
```

### Update Rule
```bash
PUT /api/rules/{id}
{
  "expression": "RSI(14) < 25",
  "is_active": false
}
```

### Delete Rule
```bash
DELETE /api/rules/{id}
```

### Evaluate Rules
```bash
POST /api/rules/evaluate
```

### Get Evaluation Status
```bash
GET /api/rules/evaluate
```

## Quantity Types

### FIXED
```json
{
  "quantity_type": "FIXED",
  "quantity_value": "10"
}
// → Buy exactly 10 shares
```

### PERCENTAGE
```json
{
  "quantity_type": "PERCENTAGE",
  "quantity_value": "25"
}
// → Invest 25% of available cash
// Example: 25% of $10,000 = $2,500 ÷ price
```

### EXPRESSION
```json
{
  "quantity_type": "EXPRESSION",
  "quantity_value": "100 / price"
}
// → Dynamic calculation
// Example: Buy $100 worth
```

## Code Examples

### Validate Expression
```typescript
import { validateExpression } from '@/lib/rules/validators';

const result = validateExpression("RSI(14) < 30");
if (!result.isValid) {
  console.error(result.error, result.details);
}
```

### Parse Expression
```typescript
import { parseExpression } from '@/lib/rules/parser';

const ast = parseExpression("RSI(14) < 30");
console.log(ast);
```

### Evaluate Rule
```typescript
import { evaluateRule } from '@/lib/rules/evaluator';

const result = evaluateRule(rule, historicalData, cashAvailable);
if (result.triggered) {
  console.log(`Buy ${result.quantity} shares`);
}
```

### Create Context
```typescript
import { createStockContext } from '@/lib/rules/context';

const context = createStockContext(historicalData);
console.log('Price:', context.price);
console.log('RSI(14):', context.RSI(14));
```

## Common Patterns

### Oversold Entry
```javascript
"RSI(14) < 30 AND volume > avgVolume(20)"
```

### Overbought Exit
```javascript
"RSI(14) > 70"
```

### Moving Average Crossover
```javascript
"close > SMA(50) AND close > SMA(200)"
```

### Volume Breakout
```javascript
"volume > avgVolume(20) * 2 AND close > high"
```

### Mean Reversion
```javascript
"close < SMA(20) * 0.95 AND RSI(14) < 40"
```

### Momentum
```javascript
"close > SMA(50) AND RSI(14) > 50 AND volume > avgVolume(20)"
```

## Error Messages

### Invalid Function
```
Error: Invalid function: MACD
Details: Valid functions are: RSI, SMA, EMA, avgVolume
```

### Invalid Property
```
Error: Invalid property: dividends
Details: Valid properties are: close, open, high, low, volume, price
```

### Invalid Operator
```
Error: Invalid operator: >>>
Details: Valid operators are: <, >, <=, >=, ==, !=, AND, OR, NOT
```

### Insufficient Data
```
Error: Insufficient data for RSI calculation
Details: Need 15 points, got 10
```

## Best Practices

1. **Start Simple**
   - Begin with basic expressions
   - Test thoroughly before activating
   - Gradually add complexity

2. **Use Descriptive Names**
   ```javascript
   ✓ "Buy AAPL when oversold (RSI < 30)"
   ✗ "Rule 1"
   ```

3. **Test Expressions**
   ```typescript
   // Validate before creating
   const valid = await validateRule(data);
   if (!valid.isValid) return;
   ```

4. **Monitor Results**
   - Check evaluation stats
   - Review triggered rules
   - Adjust parameters

5. **Reasonable Periods**
   ```javascript
   ✓ RSI(14), SMA(50), EMA(20)
   ✗ RSI(1000)  // Too much data needed
   ```

## Troubleshooting

### Rules Not Triggering
1. Check expression syntax
2. Verify `is_active = true`
3. Review stock data availability
4. Check evaluation logs

### Insufficient Data Errors
1. Reduce indicator periods
2. Fetch more historical data
3. Check symbol availability

### Performance Issues
1. Reduce active rules count
2. Simplify expressions
3. Group rules by symbol

## Import Paths

```typescript
// Parser
import {
  parseExpression,
  validateExpression,
  astToString,
  getFunctionsFromExpression,
  getRequiredDataDays,
} from '@/lib/rules/parser';

// Context
import {
  createStockContext,
  validateStockContext,
} from '@/lib/rules/context';

// Evaluator
import {
  evaluateRule,
  batchEvaluateRules,
} from '@/lib/rules/evaluator';

// Validators
import {
  validateRuleExpression,
  validateSymbol,
  validateQuantity,
  validateRule,
} from '@/lib/rules/validators';

// All-in-one
import * as RuleEngine from '@/lib/rules';
```

## Response Formats

### Success Response
```json
{
  "success": true,
  "data": { /* rule or recommendations */ },
  "message": "Operation completed"
}
```

### Error Response
```json
{
  "error": "Error type",
  "message": "User-friendly message",
  "details": "Technical details (dev only)"
}
```

### Evaluation Result
```typescript
{
  triggered: boolean;
  quantity: number;
  price: number;
  totalAmount: number;
  metadata: {
    evaluatedAt: number;
    symbol: string;
    expression: string;
    error?: string;
    contextValues?: Record<string, any>;
  };
}
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Invalid request
- `401` - Unauthorized
- `404` - Not found
- `409` - Conflict
- `429` - Rate limit exceeded
- `500` - Server error

## Need Help?

See `/lib/rules/README.md` for complete documentation.
See `/lib/rules/examples.ts` for working code examples.
