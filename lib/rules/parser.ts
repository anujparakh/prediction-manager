/**
 * Expression parser using jsep library
 * Parses trading rule expressions into Abstract Syntax Trees (AST)
 *
 * Supported operators:
 * - Comparison: <, >, <=, >=, ==, !=
 * - Logical: AND, OR, NOT
 * - Functions: RSI(period), SMA(period), EMA(period), avgVolume(period)
 * - Properties: close, open, high, low, volume, price
 *
 * Example expressions:
 * - "RSI(14) < 30 AND volume > avgVolume(20)"
 * - "close > SMA(50) OR close < EMA(20)"
 * - "NOT (price > 100)"
 */

import jsep from 'jsep';

/**
 * Valid function names that can be used in expressions
 */
const VALID_FUNCTIONS = [
  'RSI',
  'SMA',
  'EMA',
  'avgVolume',
] as const;

/**
 * Valid property names that can be accessed in expressions
 */
const VALID_PROPERTIES = [
  'close',
  'open',
  'high',
  'low',
  'volume',
  'price',
] as const;

/**
 * Valid comparison operators
 */
const VALID_COMPARISON_OPERATORS = [
  '<',
  '>',
  '<=',
  '>=',
  '==',
  '!=',
] as const;

/**
 * Valid logical operators
 */
const VALID_LOGICAL_OPERATORS = [
  'AND',
  'OR',
  'NOT',
] as const;

/**
 * Error class for expression parsing errors
 */
export class ExpressionParseError extends Error {
  constructor(message: string, public details?: string) {
    super(message);
    this.name = 'ExpressionParseError';
  }
}

/**
 * Configure jsep with custom operators
 * This needs to be called before parsing any expressions
 */
export function configureParser(): void {
  // Add logical operators
  jsep.addBinaryOp('AND', 2);
  jsep.addBinaryOp('OR', 1);
  jsep.addUnaryOp('NOT');

  // Remove default operators that might conflict
  // jsep uses && and || by default, we want AND and OR
  jsep.removeBinaryOp('&&');
  jsep.removeBinaryOp('||');
  jsep.removeUnaryOp('!');
}

// Configure parser on module load
configureParser();

/**
 * Parse an expression string into an Abstract Syntax Tree (AST)
 *
 * @param expression - The expression string to parse
 * @returns Parsed AST
 * @throws ExpressionParseError if parsing fails
 *
 * @example
 * ```typescript
 * const ast = parseExpression("RSI(14) < 30");
 * // Returns AST with BinaryExpression node
 * ```
 */
export function parseExpression(expression: string): jsep.Expression {
  if (!expression || typeof expression !== 'string') {
    throw new ExpressionParseError('Expression must be a non-empty string');
  }

  const trimmed = expression.trim();
  if (trimmed.length === 0) {
    throw new ExpressionParseError('Expression cannot be empty');
  }

  try {
    const ast = jsep(trimmed);
    return ast;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown parsing error';
    throw new ExpressionParseError(
      'Failed to parse expression',
      `${message}. Expression: "${expression}"`
    );
  }
}

/**
 * Validate an expression by parsing it and checking for valid operators and functions
 *
 * @param expression - The expression string to validate
 * @returns Object with isValid flag and optional error message
 *
 * @example
 * ```typescript
 * const result = validateExpression("RSI(14) < 30");
 * if (!result.isValid) {
 *   console.error(result.error);
 * }
 * ```
 */
export function validateExpression(expression: string): {
  isValid: boolean;
  error?: string;
  details?: string;
} {
  try {
    const ast = parseExpression(expression);

    // Recursively validate the AST
    const validationError = validateNode(ast);
    if (validationError) {
      return {
        isValid: false,
        error: validationError.message,
        details: validationError.details,
      };
    }

    return { isValid: true };
  } catch (error) {
    if (error instanceof ExpressionParseError) {
      return {
        isValid: false,
        error: error.message,
        details: error.details,
      };
    }
    return {
      isValid: false,
      error: 'Unknown validation error',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Validate an AST node recursively
 *
 * @param node - AST node to validate
 * @returns Error object if validation fails, null if valid
 */
function validateNode(
  node: jsep.Expression
): { message: string; details?: string } | null {
  switch (node.type) {
    case 'BinaryExpression': {
      const binNode = node as jsep.BinaryExpression;
      const operator = binNode.operator;

      // Check if operator is valid
      const isComparison = VALID_COMPARISON_OPERATORS.includes(
        operator as any
      );
      const isLogical = VALID_LOGICAL_OPERATORS.includes(operator as any);

      if (!isComparison && !isLogical) {
        return {
          message: `Invalid operator: ${operator}`,
          details: `Valid operators are: ${[...VALID_COMPARISON_OPERATORS, ...VALID_LOGICAL_OPERATORS].join(', ')}`,
        };
      }

      // Validate left and right sides
      const leftError = validateNode(binNode.left);
      if (leftError) return leftError;

      const rightError = validateNode(binNode.right);
      if (rightError) return rightError;

      return null;
    }

    case 'UnaryExpression': {
      const unNode = node as jsep.UnaryExpression;
      const operator = unNode.operator;

      if (!VALID_LOGICAL_OPERATORS.includes(operator as any)) {
        return {
          message: `Invalid unary operator: ${operator}`,
          details: `Valid unary operators are: ${VALID_LOGICAL_OPERATORS.join(', ')}`,
        };
      }

      return validateNode(unNode.argument);
    }

    case 'CallExpression': {
      const callNode = node as jsep.CallExpression;
      const funcName = (callNode.callee as jsep.Identifier).name;

      // Check if function is valid
      if (!VALID_FUNCTIONS.includes(funcName as any)) {
        return {
          message: `Invalid function: ${funcName}`,
          details: `Valid functions are: ${VALID_FUNCTIONS.join(', ')}`,
        };
      }

      // Validate function has exactly one argument
      if (callNode.arguments.length !== 1) {
        return {
          message: `Function ${funcName} requires exactly 1 argument`,
          details: `Received ${callNode.arguments.length} arguments`,
        };
      }

      // Validate argument is a number literal
      const arg = callNode.arguments[0];
      if (arg.type !== 'Literal' || typeof (arg as jsep.Literal).value !== 'number') {
        return {
          message: `Function ${funcName} argument must be a number`,
          details: 'Example: RSI(14), SMA(50), EMA(20)',
        };
      }

      // Validate period is positive
      const period = (arg as jsep.Literal).value as number;
      if (period <= 0 || !Number.isInteger(period)) {
        return {
          message: `Function ${funcName} period must be a positive integer`,
          details: `Received: ${period}`,
        };
      }

      return null;
    }

    case 'Identifier': {
      const identifier = (node as jsep.Identifier).name;

      // Check if identifier is a valid property
      if (!VALID_PROPERTIES.includes(identifier as any)) {
        return {
          message: `Invalid property: ${identifier}`,
          details: `Valid properties are: ${VALID_PROPERTIES.join(', ')}`,
        };
      }

      return null;
    }

    case 'Literal': {
      // Literals are always valid
      return null;
    }

    case 'Compound': {
      // Compound expressions (multiple expressions separated by commas)
      const compNode = node as jsep.Compound;
      for (const bodyNode of compNode.body) {
        const error = validateNode(bodyNode);
        if (error) return error;
      }
      return null;
    }

    default:
      return {
        message: `Unsupported expression type: ${node.type}`,
        details: 'Expression contains an unsupported construct',
      };
  }
}

/**
 * Convert an AST back to a readable string
 * This is useful for displaying expressions to users
 *
 * @param ast - AST to convert to string
 * @returns Human-readable expression string
 *
 * @example
 * ```typescript
 * const ast = parseExpression("RSI(14) < 30");
 * const str = astToString(ast);
 * // Returns: "RSI(14) < 30"
 * ```
 */
export function astToString(ast: jsep.Expression): string {
  switch (ast.type) {
    case 'BinaryExpression': {
      const binNode = ast as jsep.BinaryExpression;
      const left = astToString(binNode.left);
      const right = astToString(binNode.right);
      const operator = binNode.operator;

      // Add parentheses for clarity with logical operators
      if (VALID_LOGICAL_OPERATORS.includes(operator as any)) {
        return `(${left} ${operator} ${right})`;
      }
      return `${left} ${operator} ${right}`;
    }

    case 'UnaryExpression': {
      const unNode = ast as jsep.UnaryExpression;
      const argument = astToString(unNode.argument);
      return `${unNode.operator} ${argument}`;
    }

    case 'CallExpression': {
      const callNode = ast as jsep.CallExpression;
      const funcName = (callNode.callee as jsep.Identifier).name;
      const args = callNode.arguments.map(arg => astToString(arg)).join(', ');
      return `${funcName}(${args})`;
    }

    case 'Identifier': {
      return (ast as jsep.Identifier).name;
    }

    case 'Literal': {
      const value = (ast as jsep.Literal).value;
      if (typeof value === 'string') {
        return `"${value}"`;
      }
      return String(value);
    }

    case 'Compound': {
      const compNode = ast as jsep.Compound;
      return compNode.body.map(node => astToString(node)).join(', ');
    }

    default:
      return '[unknown]';
  }
}

/**
 * Get all function calls from an expression
 * Useful for determining what data to fetch
 *
 * @param expression - Expression string or AST
 * @returns Array of function calls with their periods
 *
 * @example
 * ```typescript
 * const functions = getFunctionsFromExpression("RSI(14) < 30 AND SMA(50) > close");
 * // Returns: [{ name: 'RSI', period: 14 }, { name: 'SMA', period: 50 }]
 * ```
 */
export function getFunctionsFromExpression(
  expression: string | jsep.Expression
): Array<{ name: string; period: number }> {
  const ast = typeof expression === 'string' ? parseExpression(expression) : expression;
  const functions: Array<{ name: string; period: number }> = [];

  function traverse(node: jsep.Expression) {
    if (node.type === 'CallExpression') {
      const callNode = node as jsep.CallExpression;
      const funcName = (callNode.callee as jsep.Identifier).name;
      const period = (callNode.arguments[0] as jsep.Literal).value as number;
      functions.push({ name: funcName, period });
    } else if (node.type === 'BinaryExpression') {
      const binNode = node as jsep.BinaryExpression;
      traverse(binNode.left);
      traverse(binNode.right);
    } else if (node.type === 'UnaryExpression') {
      const unNode = node as jsep.UnaryExpression;
      traverse(unNode.argument);
    } else if (node.type === 'Compound') {
      const compNode = node as jsep.Compound;
      compNode.body.forEach(traverse);
    }
  }

  traverse(ast);
  return functions;
}

/**
 * Get required data days for an expression
 * Calculates how many days of historical data are needed
 *
 * @param expression - Expression string or AST
 * @returns Number of days of data needed
 *
 * @example
 * ```typescript
 * const days = getRequiredDataDays("RSI(14) < 30 AND SMA(50) > close");
 * // Returns: 200 (50 * 3 for SMA, which needs the most data)
 * ```
 */
export function getRequiredDataDays(
  expression: string | jsep.Expression
): number {
  const functions = getFunctionsFromExpression(expression);

  if (functions.length === 0) {
    return 30; // Default: 30 days if no functions
  }

  // Calculate max period needed across all functions
  let maxDays = 0;
  for (const func of functions) {
    let requiredDays: number;
    switch (func.name) {
      case 'RSI':
        requiredDays = func.period * 3; // RSI needs warmup
        break;
      case 'SMA':
        requiredDays = func.period * 2;
        break;
      case 'EMA':
        requiredDays = func.period * 3;
        break;
      case 'avgVolume':
        requiredDays = func.period * 2;
        break;
      default:
        requiredDays = func.period * 2;
    }
    maxDays = Math.max(maxDays, requiredDays);
  }

  return Math.min(maxDays, 365); // Cap at 1 year
}
