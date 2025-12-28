/**
 * Example usage of the rule engine
 * These examples demonstrate how to use the various components
 */

import {
  parseExpression,
  validateExpression,
  astToString,
  getFunctionsFromExpression,
  getRequiredDataDays,
} from './parser';

import {
  createStockContext,
  validateStockContext,
} from './context';

import {
  evaluateRule,
} from './evaluator';

import {
  validateRuleExpression,
  validateSymbol,
  validateQuantity,
  validateRule,
} from './validators';

import type { Rule } from '../db/schema';
import type { HistoricalData } from '../stocks/types';

// ============================================================================
// Example 1: Parsing and Validating Expressions
// ============================================================================

export function example1_ParsingExpressions() {
  console.log('=== Example 1: Parsing Expressions ===\n');

  // Simple expression
  const expr1 = "RSI(14) < 30";
  const ast1 = parseExpression(expr1);
  console.log('Expression:', expr1);
  console.log('AST:', JSON.stringify(ast1, null, 2));
  console.log('Back to string:', astToString(ast1));
  console.log();

  // Complex expression
  const expr2 = "RSI(14) < 30 AND volume > avgVolume(20)";
  const ast2 = parseExpression(expr2);
  console.log('Expression:', expr2);
  console.log('Back to string:', astToString(ast2));
  console.log();

  // Get functions from expression
  const functions = getFunctionsFromExpression(expr2);
  console.log('Functions used:', functions);
  console.log();

  // Get required data days
  const days = getRequiredDataDays(expr2);
  console.log('Required data days:', days);
  console.log();
}

// ============================================================================
// Example 2: Validation
// ============================================================================

export async function example2_Validation() {
  console.log('=== Example 2: Validation ===\n');

  // Valid expression
  const validExpr = "RSI(14) < 30";
  const result1 = validateExpression(validExpr);
  console.log('Expression:', validExpr);
  console.log('Valid?', result1.isValid);
  console.log();

  // Invalid expression (bad function)
  const invalidExpr1 = "INVALID(14) < 30";
  const result2 = validateExpression(invalidExpr1);
  console.log('Expression:', invalidExpr1);
  console.log('Valid?', result2.isValid);
  console.log('Error:', result2.error);
  console.log('Details:', result2.details);
  console.log();

  // Invalid expression (bad operator)
  const invalidExpr2 = "RSI(14) << 30";
  const result3 = validateExpression(invalidExpr2);
  console.log('Expression:', invalidExpr2);
  console.log('Valid?', result3.isValid);
  console.log('Error:', result3.error);
  console.log();

  // Validate symbol
  console.log('Validating symbol AAPL...');
  const symbolResult = await validateSymbol('AAPL');
  console.log('Valid?', symbolResult.isValid);
  console.log();

  // Validate quantity
  const quantityResult1 = validateQuantity('FIXED', '10');
  console.log('FIXED quantity "10":', quantityResult1.isValid);

  const quantityResult2 = validateQuantity('PERCENTAGE', '25');
  console.log('PERCENTAGE quantity "25":', quantityResult2.isValid);

  const quantityResult3 = validateQuantity('EXPRESSION', '100 / price');
  console.log('EXPRESSION quantity "100 / price":', quantityResult3.isValid);
  console.log();
}

// ============================================================================
// Example 3: Creating and Evaluating Rules
// ============================================================================

export function example3_Evaluation() {
  console.log('=== Example 3: Rule Evaluation ===\n');

  // Mock historical data (in real usage, fetch from API)
  const mockHistoricalData: HistoricalData = {
    symbol: 'AAPL',
    currency: 'USD',
    exchange: 'NASDAQ',
    values: [
      // Most recent first (Twelve Data format)
      {
        datetime: '2024-01-15',
        open: 150.0,
        high: 152.0,
        low: 149.0,
        close: 151.5,
        volume: 50000000,
      },
      // Previous days (need enough for RSI calculation)
      ...Array.from({ length: 50 }, (_, i) => ({
        datetime: `2024-01-${14 - i}`,
        open: 148.0 + Math.random() * 5,
        high: 150.0 + Math.random() * 5,
        low: 147.0 + Math.random() * 5,
        close: 149.0 + Math.random() * 5,
        volume: 40000000 + Math.random() * 20000000,
      })),
    ],
  };

  // Create a test rule
  const testRule: Rule = {
    id: 'test-rule-1',
    user_id: 'test-user',
    name: 'Buy AAPL on RSI < 30',
    description: 'Buy when oversold',
    expression: 'RSI(14) < 30',
    action: 'BUY',
    symbol: 'AAPL',
    quantity_type: 'FIXED',
    quantity_value: '10',
    is_active: 1,
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  console.log('Rule:', testRule.name);
  console.log('Expression:', testRule.expression);
  console.log();

  // Create context
  const context = createStockContext(mockHistoricalData);
  console.log('Context created:');
  console.log('  Symbol:', context.symbol);
  console.log('  Current price:', context.price);
  console.log('  Volume:', context.volume);
  console.log('  RSI(14):', context.RSI(14));
  console.log('  SMA(20):', context.SMA(20));
  console.log();

  // Evaluate rule
  const result = evaluateRule(testRule, mockHistoricalData, 10000);
  console.log('Evaluation result:');
  console.log('  Triggered?', result.triggered);
  console.log('  Quantity:', result.quantity);
  console.log('  Price:', result.price);
  console.log('  Total amount:', result.totalAmount);
  console.log('  Metadata:', JSON.stringify(result.metadata, null, 2));
  console.log();
}

// ============================================================================
// Example 4: Complex Expressions
// ============================================================================

export function example4_ComplexExpressions() {
  console.log('=== Example 4: Complex Expressions ===\n');

  const expressions = [
    'RSI(14) < 30 AND volume > avgVolume(20)',
    'close > SMA(50) AND close > EMA(20)',
    '(RSI(14) < 30 OR close < SMA(200)) AND volume > avgVolume(20) * 1.5',
    'NOT (price > 100) AND RSI(14) < 40',
    'close > SMA(50) OR (RSI(14) < 30 AND volume > avgVolume(20))',
  ];

  for (const expr of expressions) {
    console.log('Expression:', expr);

    const validation = validateExpression(expr);
    console.log('  Valid?', validation.isValid);

    if (validation.isValid) {
      const functions = getFunctionsFromExpression(expr);
      console.log('  Functions:', functions.map(f => `${f.name}(${f.period})`).join(', '));

      const days = getRequiredDataDays(expr);
      console.log('  Required days:', days);
    } else {
      console.log('  Error:', validation.error);
    }

    console.log();
  }
}

// ============================================================================
// Example 5: Different Quantity Types
// ============================================================================

export function example5_QuantityTypes() {
  console.log('=== Example 5: Quantity Types ===\n');

  const mockData: HistoricalData = {
    symbol: 'AAPL',
    currency: 'USD',
    exchange: 'NASDAQ',
    values: [
      {
        datetime: '2024-01-15',
        open: 150.0,
        high: 152.0,
        low: 149.0,
        close: 150.0,
        volume: 50000000,
      },
    ],
  };

  const baseRule: Omit<Rule, 'quantity_type' | 'quantity_value'> = {
    id: 'test-rule',
    user_id: 'test-user',
    name: 'Test Rule',
    description: null,
    expression: 'price > 100',
    action: 'BUY',
    symbol: 'AAPL',
    is_active: 1,
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  // FIXED quantity
  const fixedRule: Rule = {
    ...baseRule,
    quantity_type: 'FIXED',
    quantity_value: '10',
  };
  const fixedResult = evaluateRule(fixedRule, mockData);
  console.log('FIXED (10 shares):');
  console.log('  Quantity:', fixedResult.quantity);
  console.log('  Total:', fixedResult.totalAmount);
  console.log();

  // PERCENTAGE quantity (10% of $10,000 = $1,000)
  const percentRule: Rule = {
    ...baseRule,
    quantity_type: 'PERCENTAGE',
    quantity_value: '10',
  };
  const percentResult = evaluateRule(percentRule, mockData, 10000);
  console.log('PERCENTAGE (10% of $10,000):');
  console.log('  Quantity:', percentResult.quantity);
  console.log('  Total:', percentResult.totalAmount);
  console.log();

  // EXPRESSION quantity
  const exprRule: Rule = {
    ...baseRule,
    quantity_type: 'EXPRESSION',
    quantity_value: '1000 / price',
  };
  const exprResult = evaluateRule(exprRule, mockData);
  console.log('EXPRESSION (1000 / price):');
  console.log('  Quantity:', exprResult.quantity);
  console.log('  Total:', exprResult.totalAmount);
  console.log();
}

// ============================================================================
// Run all examples
// ============================================================================

export function runAllExamples() {
  example1_ParsingExpressions();
  // example2_Validation(); // Commented out since it's async and calls external API
  example3_Evaluation();
  example4_ComplexExpressions();
  example5_QuantityTypes();
}

// Uncomment to run examples:
// runAllExamples();
