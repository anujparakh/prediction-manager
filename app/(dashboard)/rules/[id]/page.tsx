'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExpressionInput } from '@/components/rules/expression-input';
import { RuleSyntaxHelper } from '@/components/rules/rule-syntax-helper';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import type { Rule, RuleAction, QuantityType } from '@/lib/db/schema';

export default function EditRulePage() {
  const router = useRouter();
  const params = useParams();
  const ruleId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    expression: '',
    symbol: '',
    action: 'BUY' as RuleAction,
    quantity_type: 'FIXED' as QuantityType,
    quantity_value: '',
    is_active: true,
  });

  useEffect(() => {
    const fetchRule = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        const response = await fetch(`/api/rules/${ruleId}`);
        if (!response.ok) {
          const data = await response.json() as { message?: string };
          throw new Error(data.message || 'Failed to fetch rule');
        }

        const data = await response.json() as { data: Rule };
        const rule = data.data;

        setFormData({
          name: rule.name,
          description: rule.description || '',
          expression: rule.expression,
          symbol: rule.symbol,
          action: rule.action,
          quantity_type: rule.quantity_type,
          quantity_value: rule.quantity_value,
          is_active: rule.is_active === 1,
        });
      } catch (err) {
        console.error('Error fetching rule:', err);
        setLoadError(err instanceof Error ? err.message : 'Failed to fetch rule');
      } finally {
        setIsLoading(false);
      }
    };

    if (ruleId) {
      fetchRule();
    }
  }, [ruleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate required fields
    if (!formData.name.trim()) {
      setError('Rule name is required');
      return;
    }

    if (!formData.expression.trim()) {
      setError('Rule expression is required');
      return;
    }

    if (!formData.symbol.trim()) {
      setError('Stock symbol is required');
      return;
    }

    if (!formData.quantity_value.trim()) {
      setError('Quantity value is required');
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch(`/api/rules/${ruleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          expression: formData.expression.trim(),
          symbol: formData.symbol.trim().toUpperCase(),
          action: formData.action,
          quantity_type: formData.quantity_type,
          quantity_value: formData.quantity_value.trim(),
          is_active: formData.is_active,
        }),
      });

      const data = await response.json() as {
        success?: boolean;
        message?: string;
        details?: string;
      };

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update rule');
      }

      // Success! Redirect to rules list
      router.push('/rules');
    } catch (err) {
      console.error('Error updating rule:', err);
      setError(err instanceof Error ? err.message : 'Failed to update rule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExampleClick = (expression: string) => {
    setFormData((prev) => ({ ...prev, expression }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/rules">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Rules
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Edit Rule</h1>
        </div>
        <div className="text-center py-12">
          <p className="text-gray-500">Loading rule...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/rules">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Rules
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Edit Rule</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <p className="text-red-600 font-medium">Error loading rule</p>
              <p className="text-sm text-gray-500 mt-2">{loadError}</p>
              <Link href="/rules">
                <Button className="mt-4">Back to Rules</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/rules">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Rules
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-foreground">Edit Rule</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Rule Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Error Alert */}
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Rule Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Rule Name <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g., RSI Oversold Buy Signal"
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Describe what this rule does..."
                    rows={3}
                  />
                </div>

                {/* Symbol */}
                <div className="space-y-2">
                  <Label htmlFor="symbol">
                    Stock Symbol <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="symbol"
                    value={formData.symbol}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        symbol: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="e.g., AAPL, MSFT, TSLA"
                    required
                  />
                </div>

                {/* Expression */}
                <ExpressionInput
                  value={formData.expression}
                  onChange={(value) =>
                    setFormData((prev) => ({ ...prev, expression: value }))
                  }
                  label={
                    <>
                      Rule Expression <span className="text-red-600">*</span>
                    </>
                  }
                />

                {/* Action */}
                <div className="space-y-2">
                  <Label htmlFor="action">
                    Action <span className="text-red-600">*</span>
                  </Label>
                  <Select
                    value={formData.action}
                    onValueChange={(value: RuleAction) =>
                      setFormData((prev) => ({ ...prev, action: value }))
                    }
                  >
                    <SelectTrigger id="action">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BUY">BUY</SelectItem>
                      <SelectItem value="SELL">SELL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Quantity Type */}
                <div className="space-y-2">
                  <Label htmlFor="quantity_type">
                    Quantity Type <span className="text-red-600">*</span>
                  </Label>
                  <Select
                    value={formData.quantity_type}
                    onValueChange={(value: QuantityType) =>
                      setFormData((prev) => ({ ...prev, quantity_type: value }))
                    }
                  >
                    <SelectTrigger id="quantity_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FIXED">FIXED (number of shares)</SelectItem>
                      <SelectItem value="PERCENTAGE">
                        PERCENTAGE (% of portfolio)
                      </SelectItem>
                      <SelectItem value="EXPRESSION">
                        EXPRESSION (calculated)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Quantity Value */}
                <div className="space-y-2">
                  <Label htmlFor="quantity_value">
                    Quantity Value <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="quantity_value"
                    value={formData.quantity_value}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        quantity_value: e.target.value,
                      }))
                    }
                    placeholder={
                      formData.quantity_type === 'FIXED'
                        ? 'e.g., 10'
                        : formData.quantity_type === 'PERCENTAGE'
                        ? 'e.g., 25 (for 25%)'
                        : 'e.g., cash_available / close'
                    }
                    required
                  />
                  <p className="text-xs text-gray-400">
                    {formData.quantity_type === 'FIXED' &&
                      'Enter the number of shares to buy/sell'}
                    {formData.quantity_type === 'PERCENTAGE' &&
                      'Enter percentage of portfolio value (0-100)'}
                    {formData.quantity_type === 'EXPRESSION' &&
                      'Enter an expression to calculate quantity'}
                  </p>
                </div>

                {/* Is Active */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        is_active: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
                  />
                  <Label htmlFor="is_active" className="font-normal text-gray-200">
                    Rule is active
                  </Label>
                </div>

                {/* Submit Button */}
                <div className="flex items-center gap-4 pt-4">
                  <Button type="submit" disabled={isSubmitting} className="flex-1">
                    {isSubmitting ? 'Updating Rule...' : 'Update Rule'}
                  </Button>
                  <Link href="/rules" className="flex-1">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isSubmitting}
                      className="w-full"
                    >
                      Cancel
                    </Button>
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Syntax Helper */}
        <div className="lg:col-span-1">
          <RuleSyntaxHelper onExampleClick={handleExampleClick} />
        </div>
      </div>
    </div>
  );
}
