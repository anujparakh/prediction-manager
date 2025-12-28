/**
 * Rule validation functions
 * Validates rule expressions, symbols, and quantity configurations
 */

import { validateExpression } from './parser';
import { validateSymbol as validateStockSymbol } from '../stocks/api-client';
import type { QuantityType } from '../db/schema';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  details?: string;
}

/**
 * Validate a rule expression
 * Checks syntax and ensures all functions and operators are valid
 *
 * @param expression - Expression string to validate
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = validateRuleExpression("RSI(14) < 30");
 * if (!result.isValid) {
 *   console.error(result.error);
 * }
 * ```
 */
export function validateRuleExpression(expression: string): ValidationResult {
  // Check if expression is empty
  if (!expression || typeof expression !== 'string') {
    return {
      isValid: false,
      error: 'Expression is required',
      details: 'Expression must be a non-empty string',
    };
  }

  const trimmed = expression.trim();
  if (trimmed.length === 0) {
    return {
      isValid: false,
      error: 'Expression cannot be empty',
      details: 'Please provide a valid expression',
    };
  }

  // Use parser's validation
  const result = validateExpression(expression);

  return result;
}

/**
 * Validate a stock symbol
 * Checks if the symbol exists and is valid
 *
 * @param symbol - Stock symbol to validate
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = await validateSymbol("AAPL");
 * if (!result.isValid) {
 *   console.error(result.error);
 * }
 * ```
 */
export async function validateSymbol(symbol: string): Promise<ValidationResult> {
  // Check if symbol is empty
  if (!symbol || typeof symbol !== 'string') {
    return {
      isValid: false,
      error: 'Symbol is required',
      details: 'Symbol must be a non-empty string',
    };
  }

  const trimmed = symbol.trim().toUpperCase();
  if (trimmed.length === 0) {
    return {
      isValid: false,
      error: 'Symbol cannot be empty',
      details: 'Please provide a valid stock symbol (e.g., AAPL, MSFT)',
    };
  }

  // Check symbol format (letters only, 1-5 characters)
  const symbolRegex = /^[A-Z]{1,5}$/;
  if (!symbolRegex.test(trimmed)) {
    return {
      isValid: false,
      error: 'Invalid symbol format',
      details: 'Symbol must be 1-5 uppercase letters (e.g., AAPL, MSFT, GOOGL)',
    };
  }

  // Validate with stock API
  try {
    const isValid = await validateStockSymbol(trimmed);
    if (!isValid) {
      return {
        isValid: false,
        error: 'Symbol not found',
        details: `Stock symbol "${trimmed}" does not exist or is not supported`,
      };
    }

    return { isValid: true };
  } catch (error) {
    // If API call fails, still return success but with a warning
    // We don't want to block rule creation if the API is temporarily down
    console.warn(`Could not validate symbol ${trimmed}:`, error);
    return { isValid: true };
  }
}

/**
 * Validate a quantity configuration
 * Checks if the quantity type and value are valid
 *
 * @param quantityType - Type of quantity calculation
 * @param quantityValue - Value or expression for quantity
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = validateQuantity("FIXED", "10");
 * if (!result.isValid) {
 *   console.error(result.error);
 * }
 * ```
 */
export function validateQuantity(
  quantityType: QuantityType,
  quantityValue: string
): ValidationResult {
  // Check if type is valid
  const validTypes: QuantityType[] = ['FIXED', 'PERCENTAGE', 'EXPRESSION'];
  if (!validTypes.includes(quantityType)) {
    return {
      isValid: false,
      error: 'Invalid quantity type',
      details: `Quantity type must be one of: ${validTypes.join(', ')}`,
    };
  }

  // Check if value is empty
  if (!quantityValue || typeof quantityValue !== 'string') {
    return {
      isValid: false,
      error: 'Quantity value is required',
      details: 'Quantity value must be a non-empty string',
    };
  }

  const trimmed = quantityValue.trim();
  if (trimmed.length === 0) {
    return {
      isValid: false,
      error: 'Quantity value cannot be empty',
      details: 'Please provide a valid quantity value',
    };
  }

  // Validate based on type
  switch (quantityType) {
    case 'FIXED': {
      // Must be a positive number
      const value = parseFloat(trimmed);
      if (isNaN(value)) {
        return {
          isValid: false,
          error: 'Invalid FIXED quantity',
          details: 'Value must be a number (e.g., 10, 25.5)',
        };
      }
      if (value <= 0) {
        return {
          isValid: false,
          error: 'Invalid FIXED quantity',
          details: 'Value must be greater than 0',
        };
      }
      return { isValid: true };
    }

    case 'PERCENTAGE': {
      // Must be a number between 0 and 100
      const value = parseFloat(trimmed);
      if (isNaN(value)) {
        return {
          isValid: false,
          error: 'Invalid PERCENTAGE quantity',
          details: 'Value must be a number (e.g., 10, 25.5)',
        };
      }
      if (value <= 0 || value > 100) {
        return {
          isValid: false,
          error: 'Invalid PERCENTAGE quantity',
          details: 'Value must be between 0 and 100',
        };
      }
      return { isValid: true };
    }

    case 'EXPRESSION': {
      // Validate as an expression
      const result = validateRuleExpression(trimmed);
      if (!result.isValid) {
        return {
          isValid: false,
          error: 'Invalid EXPRESSION quantity',
          details: result.details || result.error,
        };
      }
      return { isValid: true };
    }

    default:
      return {
        isValid: false,
        error: 'Unknown quantity type',
        details: `Unsupported quantity type: ${quantityType}`,
      };
  }
}

/**
 * Validate a complete rule configuration
 * Checks all aspects of a rule: expression, symbol, and quantity
 *
 * @param data - Rule data to validate
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = await validateRule({
 *   expression: "RSI(14) < 30",
 *   symbol: "AAPL",
 *   quantity_type: "FIXED",
 *   quantity_value: "10"
 * });
 * if (!result.isValid) {
 *   console.error(result.error);
 * }
 * ```
 */
export async function validateRule(data: {
  expression: string;
  symbol: string;
  quantity_type: QuantityType;
  quantity_value: string;
}): Promise<ValidationResult> {
  // Validate expression
  const exprResult = validateRuleExpression(data.expression);
  if (!exprResult.isValid) {
    return {
      isValid: false,
      error: 'Invalid expression',
      details: exprResult.details || exprResult.error,
    };
  }

  // Validate symbol
  const symbolResult = await validateSymbol(data.symbol);
  if (!symbolResult.isValid) {
    return {
      isValid: false,
      error: 'Invalid symbol',
      details: symbolResult.details || symbolResult.error,
    };
  }

  // Validate quantity
  const quantityResult = validateQuantity(
    data.quantity_type,
    data.quantity_value
  );
  if (!quantityResult.isValid) {
    return {
      isValid: false,
      error: 'Invalid quantity',
      details: quantityResult.details || quantityResult.error,
    };
  }

  return { isValid: true };
}

/**
 * Validate rule name
 * Ensures name is not empty and within length limits
 *
 * @param name - Rule name to validate
 * @returns Validation result
 */
export function validateRuleName(name: string): ValidationResult {
  if (!name || typeof name !== 'string') {
    return {
      isValid: false,
      error: 'Name is required',
      details: 'Name must be a non-empty string',
    };
  }

  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return {
      isValid: false,
      error: 'Name cannot be empty',
      details: 'Please provide a rule name',
    };
  }

  if (trimmed.length > 100) {
    return {
      isValid: false,
      error: 'Name is too long',
      details: 'Name must be 100 characters or less',
    };
  }

  return { isValid: true };
}

/**
 * Validate rule description (optional field)
 *
 * @param description - Rule description to validate
 * @returns Validation result
 */
export function validateRuleDescription(
  description: string | null | undefined
): ValidationResult {
  // Description is optional
  if (!description) {
    return { isValid: true };
  }

  if (typeof description !== 'string') {
    return {
      isValid: false,
      error: 'Invalid description',
      details: 'Description must be a string',
    };
  }

  if (description.length > 500) {
    return {
      isValid: false,
      error: 'Description is too long',
      details: 'Description must be 500 characters or less',
    };
  }

  return { isValid: true };
}

/**
 * Sanitize a symbol string
 * Trims whitespace and converts to uppercase
 *
 * @param symbol - Symbol to sanitize
 * @returns Sanitized symbol
 */
export function sanitizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

/**
 * Sanitize an expression string
 * Trims whitespace and normalizes whitespace within
 *
 * @param expression - Expression to sanitize
 * @returns Sanitized expression
 */
export function sanitizeExpression(expression: string): string {
  // Trim and normalize whitespace
  return expression.trim().replace(/\s+/g, ' ');
}

/**
 * Get helpful error message for common validation errors
 *
 * @param error - Error message
 * @returns User-friendly error message with suggestions
 */
export function getHelpfulErrorMessage(error: string): string {
  const lowerError = error.toLowerCase();

  if (lowerError.includes('invalid function')) {
    return `${error}\n\nValid functions are: RSI(period), SMA(period), EMA(period), avgVolume(period)\nExample: RSI(14) < 30`;
  }

  if (lowerError.includes('invalid property')) {
    return `${error}\n\nValid properties are: close, open, high, low, volume, price\nExample: close > SMA(50)`;
  }

  if (lowerError.includes('invalid operator')) {
    return `${error}\n\nValid operators are:\n- Comparison: <, >, <=, >=, ==, !=\n- Logical: AND, OR, NOT\nExample: RSI(14) < 30 AND volume > avgVolume(20)`;
  }

  if (lowerError.includes('symbol not found')) {
    return `${error}\n\nPlease check that the stock symbol is correct and is traded on a supported exchange.`;
  }

  return error;
}
