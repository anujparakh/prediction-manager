/**
 * API routes for individual trading rules
 * GET /api/rules/[id] - Get a specific rule
 * PUT /api/rules/[id] - Update a rule
 * DELETE /api/rules/[id] - Delete a rule
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  getRuleById,
  updateRule,
  deleteRule,
} from '@/lib/db/queries/rules';
import { validateRule } from '@/lib/rules/validators';
import type { RuleAction, QuantityType } from '@/lib/db/schema';

// Use Edge Runtime for Cloudflare Workers compatibility

/**
 * GET handler - Get a specific rule
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'You must be logged in to access rules',
        },
        { status: 401 }
      );
    }

    const { id } = await params;
    const ruleId = id;

    console.log(`[API] Getting rule ${ruleId} for user ${userId}`);

    // Fetch rule
    const rule = await getRuleById(ruleId, userId);

    if (!rule) {
      return NextResponse.json(
        {
          error: 'Not found',
          message: 'Rule not found or you do not have access to it',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: rule,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Error getting rule:', error);

    return NextResponse.json(
      {
        error: 'Failed to get rule',
        message: 'An error occurred while fetching the rule',
        details:
          process.env.NODE_ENV === 'development' && error instanceof Error
            ? error.message
            : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * PUT handler - Update a rule
 * Request body can include any of:
 * {
 *   name?: string,
 *   description?: string,
 *   expression?: string,
 *   action?: "BUY" | "SELL",
 *   symbol?: string,
 *   quantity_type?: "FIXED" | "PERCENTAGE" | "EXPRESSION",
 *   quantity_value?: string,
 *   is_active?: boolean
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'You must be logged in to update rules',
        },
        { status: 401 }
      );
    }

    const { id } = await params;
    const ruleId = id;

    // Parse request body
    const body = await request.json() as Partial<{
      name: string;
      description: string;
      expression: string;
      action: 'BUY' | 'SELL';
      symbol: string;
      quantity_type: string;
      quantity_value: string;
      is_active: boolean;
    }>;

    // Validate fields if they're being updated
    if (body.name !== undefined && typeof body.name !== 'string') {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'Rule name must be a string',
        },
        { status: 400 }
      );
    }

    if (body.expression !== undefined && typeof body.expression !== 'string') {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'Rule expression must be a string',
        },
        { status: 400 }
      );
    }

    if (body.action !== undefined && !['BUY', 'SELL'].includes(body.action)) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'Action must be either BUY or SELL',
        },
        { status: 400 }
      );
    }

    if (body.symbol !== undefined && typeof body.symbol !== 'string') {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'Stock symbol must be a string',
        },
        { status: 400 }
      );
    }

    if (
      body.quantity_type !== undefined &&
      !['FIXED', 'PERCENTAGE', 'EXPRESSION'].includes(body.quantity_type)
    ) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'Quantity type must be FIXED, PERCENTAGE, or EXPRESSION',
        },
        { status: 400 }
      );
    }

    if (
      body.quantity_value !== undefined &&
      typeof body.quantity_value !== 'string'
    ) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'Quantity value must be a string',
        },
        { status: 400 }
      );
    }

    // Get existing rule to validate updates
    const existingRule = await getRuleById(ruleId, userId);
    if (!existingRule) {
      return NextResponse.json(
        {
          error: 'Not found',
          message: 'Rule not found or you do not have access to it',
        },
        { status: 404 }
      );
    }

    // If expression, symbol, quantity_type, or quantity_value are being updated,
    // validate the complete rule configuration
    if (
      body.expression !== undefined ||
      body.symbol !== undefined ||
      body.quantity_type !== undefined ||
      body.quantity_value !== undefined
    ) {
      const validationData = {
        expression: body.expression || existingRule.expression,
        symbol: body.symbol || existingRule.symbol,
        quantity_type:
          (body.quantity_type as QuantityType) || existingRule.quantity_type,
        quantity_value: body.quantity_value || existingRule.quantity_value,
      };

      console.log(`[API] Validating rule update for ${ruleId}`);
      const validationResult = await validateRule(validationData);

      if (!validationResult.isValid) {
        return NextResponse.json(
          {
            error: 'Invalid rule',
            message: validationResult.error || 'Rule validation failed',
            details: validationResult.details,
          },
          { status: 400 }
        );
      }
    }

    // Build update object
    const updateData: any = {};

    if (body.name !== undefined) {
      updateData.name = body.name.trim();
    }

    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || null;
    }

    if (body.expression !== undefined) {
      updateData.expression = body.expression.trim();
    }

    if (body.action !== undefined) {
      updateData.action = body.action as RuleAction;
    }

    if (body.symbol !== undefined) {
      updateData.symbol = body.symbol.trim().toUpperCase();
    }

    if (body.quantity_type !== undefined) {
      updateData.quantity_type = body.quantity_type as QuantityType;
    }

    if (body.quantity_value !== undefined) {
      updateData.quantity_value = body.quantity_value.trim();
    }

    if (body.is_active !== undefined) {
      updateData.is_active = body.is_active === true;
    }

    console.log(`[API] Updating rule ${ruleId} for user ${userId}`);

    // Update rule
    const updatedRule = await updateRule(ruleId, userId, updateData);

    if (!updatedRule) {
      return NextResponse.json(
        {
          error: 'Not found',
          message: 'Rule not found or you do not have access to it',
        },
        { status: 404 }
      );
    }

    console.log(`[API] Rule updated successfully: ${ruleId}`);

    return NextResponse.json(
      {
        success: true,
        data: updatedRule,
        message: 'Rule updated successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Error updating rule:', error);

    return NextResponse.json(
      {
        error: 'Failed to update rule',
        message: 'An error occurred while updating the rule',
        details:
          process.env.NODE_ENV === 'development' && error instanceof Error
            ? error.message
            : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler - Delete a rule
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'You must be logged in to delete rules',
        },
        { status: 401 }
      );
    }

    const { id } = await params;
    const ruleId = id;

    console.log(`[API] Deleting rule ${ruleId} for user ${userId}`);

    // Delete rule
    const deleted = await deleteRule(ruleId, userId);

    if (!deleted) {
      return NextResponse.json(
        {
          error: 'Not found',
          message: 'Rule not found or you do not have access to it',
        },
        { status: 404 }
      );
    }

    console.log(`[API] Rule deleted successfully: ${ruleId}`);

    return NextResponse.json(
      {
        success: true,
        message: 'Rule deleted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Error deleting rule:', error);

    return NextResponse.json(
      {
        error: 'Failed to delete rule',
        message: 'An error occurred while deleting the rule',
        details:
          process.env.NODE_ENV === 'development' && error instanceof Error
            ? error.message
            : undefined,
      },
      { status: 500 }
    );
  }
}
