/**
 * Rule evaluation engine
 * Evaluates trading rule expressions against stock data
 * and calculates quantity based on quantity type
 */

import * as jsep from 'jsep';
import type { Rule, QuantityType } from '../db/schema';
import type { HistoricalData } from '../stocks/types';
import { parseExpression } from './parser';
import { createStockContext, type StockContext } from './context';

/**
 * Result of evaluating a rule
 */
export interface RuleEvaluationResult {
  /** Whether the rule condition was met (true) or not (false) */
  triggered: boolean;

  /** Calculated quantity of shares to buy/sell (only if triggered is true) */
  quantity: number;

  /** Current stock price used in evaluation */
  price: number;

  /** Total amount (quantity * price) */
  totalAmount: number;

  /** Metadata about the evaluation */
  metadata: {
    /** When the evaluation occurred */
    evaluatedAt: number;
    /** Stock symbol */
    symbol: string;
    /** Rule expression that was evaluated */
    expression: string;
    /** Error message if evaluation failed */
    error?: string;
    /** Debug info about context values used */
    contextValues?: Record<string, any>;
  };
}

/**
 * Error thrown when rule evaluation fails
 */
export class RuleEvaluationError extends Error {
  constructor(
    message: string,
    public details?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'RuleEvaluationError';
  }
}

/**
 * Evaluate a rule expression against stock data
 *
 * @param rule - The rule to evaluate
 * @param stockData - Historical stock data
 * @param userCashAvailable - User's available cash (for PERCENTAGE quantity type)
 * @returns Evaluation result with triggered flag and calculated quantity
 * @throws RuleEvaluationError if evaluation fails
 *
 * @example
 * ```typescript
 * const result = await evaluateRule(rule, historicalData, 10000);
 * if (result.triggered) {
 *   console.log(`Buy ${result.quantity} shares at $${result.price}`);
 * }
 * ```
 */
export function evaluateRule(
  rule: Rule,
  stockData: HistoricalData,
  userCashAvailable?: number
): RuleEvaluationResult {
  try {
    // Create evaluation context
    const context = createStockContext(stockData);

    // Parse and evaluate the expression
    const ast = parseExpression(rule.expression);
    const triggered = evaluateExpression(ast, context);

    // If not triggered, return early
    if (!triggered) {
      return {
        triggered: false,
        quantity: 0,
        price: context.price,
        totalAmount: 0,
        metadata: {
          evaluatedAt: Date.now(),
          symbol: rule.symbol,
          expression: rule.expression,
          contextValues: {
            price: context.price,
            volume: context.volume,
          },
        },
      };
    }

    // Calculate quantity
    const quantity = calculateQuantity(
      rule.quantity_type,
      rule.quantity_value,
      context,
      userCashAvailable
    );

    // Round quantity to whole shares
    const roundedQuantity = Math.floor(quantity);

    // Ensure quantity is positive
    if (roundedQuantity <= 0) {
      throw new RuleEvaluationError(
        'Calculated quantity must be positive',
        `Got ${roundedQuantity} from calculation`
      );
    }

    const totalAmount = roundedQuantity * context.price;

    return {
      triggered: true,
      quantity: roundedQuantity,
      price: context.price,
      totalAmount,
      metadata: {
        evaluatedAt: Date.now(),
        symbol: rule.symbol,
        expression: rule.expression,
        contextValues: {
          price: context.price,
          volume: context.volume,
          calculatedQuantity: quantity,
          roundedQuantity,
        },
      },
    };
  } catch (error) {
    // Return failed evaluation result instead of throwing
    const message =
      error instanceof Error ? error.message : 'Unknown evaluation error';
    const details =
      error instanceof RuleEvaluationError
        ? error.details
        : error instanceof Error
          ? error.stack
          : undefined;

    return {
      triggered: false,
      quantity: 0,
      price: 0,
      totalAmount: 0,
      metadata: {
        evaluatedAt: Date.now(),
        symbol: rule.symbol,
        expression: rule.expression,
        error: `${message}${details ? ': ' + details : ''}`,
      },
    };
  }
}

/**
 * Evaluate an AST expression recursively
 *
 * @param node - AST node to evaluate
 * @param context - Stock context with data and functions
 * @returns Boolean result or numeric value
 * @throws RuleEvaluationError if evaluation fails
 */
function evaluateExpression(
  node: jsep.Expression,
  context: StockContext
): boolean {
  const result = evaluateNode(node, context);

  // Convert result to boolean
  if (typeof result === 'boolean') {
    return result;
  }

  // For numeric results, treat non-zero as true
  if (typeof result === 'number') {
    return result !== 0;
  }

  throw new RuleEvaluationError(
    'Expression must evaluate to a boolean or number',
    `Got ${typeof result}: ${result}`
  );
}

/**
 * Evaluate a single AST node
 *
 * @param node - AST node to evaluate
 * @param context - Stock context
 * @returns Evaluated value (boolean, number, or null)
 */
function evaluateNode(
  node: jsep.Expression,
  context: StockContext
): boolean | number | null {
  switch (node.type) {
    case 'BinaryExpression': {
      const binNode = node as jsep.BinaryExpression;
      const left = evaluateNode(binNode.left, context);
      const right = evaluateNode(binNode.right, context);

      return evaluateBinaryOperator(binNode.operator, left, right);
    }

    case 'UnaryExpression': {
      const unNode = node as jsep.UnaryExpression;
      const argument = evaluateNode(unNode.argument, context);

      if (unNode.operator === 'NOT') {
        // Convert to boolean and negate
        return !argument;
      }

      throw new RuleEvaluationError(
        `Unsupported unary operator: ${unNode.operator}`
      );
    }

    case 'CallExpression': {
      const callNode = node as jsep.CallExpression;
      const funcName = (callNode.callee as jsep.Identifier).name;
      const period = (callNode.arguments[0] as jsep.Literal).value as number;

      // Call the function from context
      const func = (context as any)[funcName];
      if (typeof func !== 'function') {
        throw new RuleEvaluationError(
          `Function ${funcName} not found in context`
        );
      }

      const result = func(period);
      return result;
    }

    case 'Identifier': {
      const identifier = (node as jsep.Identifier).name;
      const value = (context as any)[identifier];

      if (typeof value !== 'number') {
        throw new RuleEvaluationError(
          `Property ${identifier} not found or not a number`,
          `Got ${typeof value}: ${value}`
        );
      }

      return value;
    }

    case 'Literal': {
      const value = (node as jsep.Literal).value;
      if (typeof value === 'number' || typeof value === 'boolean') {
        return value;
      }
      throw new RuleEvaluationError(
        `Unsupported literal type: ${typeof value}`
      );
    }

    default:
      throw new RuleEvaluationError(
        `Unsupported expression type: ${node.type}`
      );
  }
}

/**
 * Evaluate a binary operator
 *
 * @param operator - Operator (+, -, *, /, <, >, <=, >=, ==, !=, AND, OR)
 * @param left - Left operand
 * @param right - Right operand
 * @returns Result of operation
 */
function evaluateBinaryOperator(
  operator: string,
  left: boolean | number | null,
  right: boolean | number | null
): boolean | number {
  // Handle null values
  if (left === null || right === null) {
    // For comparisons with null, return false
    if (['<', '>', '<=', '>=', '==', '!='].includes(operator)) {
      return operator === '!=' ? left !== right : false;
    }
    // For logical operators, treat null as false
    if (operator === 'AND') {
      return false;
    }
    if (operator === 'OR') {
      return !!left || !!right;
    }
  }

  // Comparison operators
  switch (operator) {
    case '<':
      return Number(left) < Number(right);
    case '>':
      return Number(left) > Number(right);
    case '<=':
      return Number(left) <= Number(right);
    case '>=':
      return Number(left) >= Number(right);
    case '==':
      return left === right;
    case '!=':
      return left !== right;
  }

  // Logical operators
  switch (operator) {
    case 'AND':
      return !!left && !!right;
    case 'OR':
      return !!left || !!right;
  }

  // Arithmetic operators (for quantity expressions)
  switch (operator) {
    case '+':
      return Number(left) + Number(right);
    case '-':
      return Number(left) - Number(right);
    case '*':
      return Number(left) * Number(right);
    case '/':
      if (Number(right) === 0) {
        throw new RuleEvaluationError('Division by zero');
      }
      return Number(left) / Number(right);
  }

  throw new RuleEvaluationError(`Unsupported operator: ${operator}`);
}

/**
 * Calculate quantity based on quantity type
 *
 * @param quantityType - Type of quantity calculation
 * @param quantityValue - Value or expression for calculation
 * @param context - Stock context
 * @param userCashAvailable - User's available cash (for PERCENTAGE)
 * @returns Calculated quantity
 * @throws RuleEvaluationError if calculation fails
 */
function calculateQuantity(
  quantityType: QuantityType,
  quantityValue: string,
  context: StockContext,
  userCashAvailable?: number
): number {
  switch (quantityType) {
    case 'FIXED': {
      // Fixed number of shares
      const quantity = parseFloat(quantityValue);
      if (isNaN(quantity) || quantity <= 0) {
        throw new RuleEvaluationError(
          'Invalid FIXED quantity',
          `Value must be a positive number, got: ${quantityValue}`
        );
      }
      return quantity;
    }

    case 'PERCENTAGE': {
      // Percentage of available cash
      if (userCashAvailable === undefined) {
        throw new RuleEvaluationError(
          'User cash available is required for PERCENTAGE quantity type',
          'Pass userCashAvailable parameter to evaluateRule'
        );
      }

      const percentage = parseFloat(quantityValue);
      if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
        throw new RuleEvaluationError(
          'Invalid PERCENTAGE quantity',
          `Value must be between 0 and 100, got: ${quantityValue}`
        );
      }

      // Calculate amount to invest
      const amountToInvest = (userCashAvailable * percentage) / 100;

      // Calculate number of shares
      const quantity = amountToInvest / context.price;

      return quantity;
    }

    case 'EXPRESSION': {
      // Evaluate expression to calculate quantity
      try {
        const ast = parseExpression(quantityValue);
        const result = evaluateNode(ast, context);

        if (typeof result !== 'number') {
          throw new RuleEvaluationError(
            'Quantity expression must evaluate to a number',
            `Got ${typeof result}: ${result}`
          );
        }

        if (result <= 0) {
          throw new RuleEvaluationError(
            'Quantity expression must evaluate to a positive number',
            `Got: ${result}`
          );
        }

        return result;
      } catch (error) {
        throw new RuleEvaluationError(
          'Failed to evaluate quantity expression',
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    default:
      throw new RuleEvaluationError(
        `Unsupported quantity type: ${quantityType}`
      );
  }
}

/**
 * Batch evaluate multiple rules
 * Useful for evaluating all active rules at once
 *
 * @param rules - Array of rules to evaluate
 * @param stockDataMap - Map of symbol to historical data
 * @param userCashAvailable - User's available cash
 * @returns Array of evaluation results
 */
export function batchEvaluateRules(
  rules: Rule[],
  stockDataMap: Map<string, HistoricalData>,
  userCashAvailable?: number
): Array<{
  rule: Rule;
  result: RuleEvaluationResult;
}> {
  const results: Array<{
    rule: Rule;
    result: RuleEvaluationResult;
  }> = [];

  for (const rule of rules) {
    const stockData = stockDataMap.get(rule.symbol);

    if (!stockData) {
      // No stock data available for this symbol
      results.push({
        rule,
        result: {
          triggered: false,
          quantity: 0,
          price: 0,
          totalAmount: 0,
          metadata: {
            evaluatedAt: Date.now(),
            symbol: rule.symbol,
            expression: rule.expression,
            error: `No stock data available for ${rule.symbol}`,
          },
        },
      });
      continue;
    }

    try {
      const result = evaluateRule(rule, stockData, userCashAvailable);
      results.push({ rule, result });
    } catch (error) {
      // This shouldn't happen since evaluateRule catches errors,
      // but handle it just in case
      results.push({
        rule,
        result: {
          triggered: false,
          quantity: 0,
          price: 0,
          totalAmount: 0,
          metadata: {
            evaluatedAt: Date.now(),
            symbol: rule.symbol,
            expression: rule.expression,
            error: error instanceof Error ? error.message : String(error),
          },
        },
      });
    }
  }

  return results;
}
