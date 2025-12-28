'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Check, X, TrendingUp, TrendingDown } from 'lucide-react';
import type { Recommendation } from '@/lib/db/schema';

interface RecommendationCardProps {
  recommendation: Recommendation;
  onStatusChange: () => void;
}

export function RecommendationCard({
  recommendation,
  onStatusChange,
}: RecommendationCardProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isBuy = recommendation.action === 'BUY';
  const isPending = recommendation.status === 'PENDING';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleExecute = async () => {
    try {
      setIsExecuting(true);
      setError(null);

      const response = await fetch(`/api/recommendations/${recommendation.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'EXECUTED' }),
      });

      const data = await response.json() as { message?: string };

      if (!response.ok) {
        throw new Error(data.message || 'Failed to execute recommendation');
      }

      toast.success('Recommendation executed successfully', {
        description: `${recommendation.action} ${recommendation.quantity} shares of ${recommendation.symbol}`,
      });

      // Notify parent component to refresh
      onStatusChange();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute recommendation';
      setError(errorMessage);

      toast.error('Failed to execute recommendation', {
        description: errorMessage,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleDismiss = async () => {
    try {
      setIsDismissing(true);
      setError(null);

      const response = await fetch(`/api/recommendations/${recommendation.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'DISMISSED' }),
      });

      const data = await response.json() as { message?: string };

      if (!response.ok) {
        throw new Error(data.message || 'Failed to dismiss recommendation');
      }

      toast.success('Recommendation dismissed', {
        description: `${recommendation.symbol} ${recommendation.action} recommendation dismissed`,
      });

      // Notify parent component to refresh
      onStatusChange();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to dismiss recommendation';
      setError(errorMessage);

      toast.error('Failed to dismiss recommendation', {
        description: errorMessage,
      });
    } finally {
      setIsDismissing(false);
    }
  };

  return (
    <Card
      className={`${
        isBuy
          ? 'border-l-4 border-l-green-500'
          : 'border-l-4 border-l-red-500'
      }`}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                isBuy ? 'bg-green-100' : 'bg-red-100'
              }`}
            >
              {isBuy ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600" />
              )}
            </div>
            <div>
              <h3 className="text-2xl font-bold">{recommendation.symbol}</h3>
              <p className="text-sm text-muted-foreground">{recommendation.rule_name}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge
              variant={isBuy ? 'default' : 'destructive'}
              className={isBuy ? 'bg-green-600' : ''}
            >
              {recommendation.action}
            </Badge>
            <Badge
              variant={
                recommendation.status === 'EXECUTED'
                  ? 'default'
                  : recommendation.status === 'DISMISSED'
                    ? 'secondary'
                    : 'outline'
              }
            >
              {recommendation.status}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-muted-foreground">Quantity</p>
            <p className="text-lg font-semibold">
              {recommendation.quantity} shares
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Price</p>
            <p className="text-lg font-semibold">
              {formatCurrency(recommendation.price)}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-muted-foreground">Total Amount</p>
          <p className={`text-2xl font-bold ${isBuy ? 'text-green-600' : 'text-red-600'}`}>
            {isBuy ? '-' : '+'}
            {formatCurrency(recommendation.total_amount)}
          </p>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>Evaluated: {formatDate(recommendation.evaluated_at)}</p>
          {recommendation.executed_at && (
            <p>Executed: {formatDate(recommendation.executed_at)}</p>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-950/50 border border-red-800 rounded-md">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
      </CardContent>

      {isPending && (
        <CardFooter className="flex gap-2 pt-0">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                className="flex-1 gap-2"
                disabled={isExecuting || isDismissing}
              >
                <Check className="w-4 h-4" />
                Mark as Done
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Mark this recommendation as done?</AlertDialogTitle>
                <AlertDialogDescription>
                  <div className="space-y-4 text-left">
                    <div className="text-base font-semibold text-foreground">
                      {recommendation.action} {recommendation.quantity} shares of{' '}
                      {recommendation.symbol} @ {formatCurrency(recommendation.price)}
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      Total: {formatCurrency(recommendation.total_amount)}
                    </div>
                    <div className="space-y-2 text-sm">
                      <p className="font-medium text-foreground">This will:</p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>Create a transaction record</li>
                        <li>
                          Update your cash balance (
                          {isBuy ? '-' : '+'}
                          {formatCurrency(recommendation.total_amount)})
                        </li>
                        <li>Mark this recommendation as executed</li>
                      </ul>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Are you sure you have completed this trade in your brokerage
                      account?
                    </p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleExecute} disabled={isExecuting}>
                  {isExecuting ? 'Processing...' : 'Confirm'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            variant="outline"
            className="gap-2"
            onClick={handleDismiss}
            disabled={isExecuting || isDismissing}
          >
            <X className="w-4 h-4" />
            Dismiss
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
