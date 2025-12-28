'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pencil, DollarSign } from 'lucide-react';

interface CashDisplayProps {
  cashAvailable: number;
  onUpdate?: (newCash: number) => void;
}

export function CashDisplay({ cashAvailable, onUpdate }: CashDisplayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newCash, setNewCash] = useState(cashAvailable.toString());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const cashValue = parseFloat(newCash);

    // Validate
    if (isNaN(cashValue) || cashValue < 0) {
      setError('Please enter a valid positive number');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/portfolio', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cash_available: cashValue,
        }),
      });

      if (!response.ok) {
        const data = await response.json() as { message?: string };
        throw new Error(data.message || 'Failed to update cash balance');
      }

      const data = await response.json() as { data: { cash_available: number } };

      toast.success('Cash balance updated', {
        description: `New balance: ${formatCurrency(data.data.cash_available)}`,
      });

      // Call onUpdate callback if provided
      if (onUpdate) {
        onUpdate(data.data.cash_available);
      }

      setIsOpen(false);
      setNewCash(data.data.cash_available.toString());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update cash balance';
      setError(errorMessage);

      toast.error('Failed to update cash balance', {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // Reset form when opening
      setNewCash(cashAvailable.toString());
      setError(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Cash Available</CardTitle>
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Pencil className="w-4 h-4" />
              Edit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Cash Balance</DialogTitle>
              <DialogDescription>
                Set your available cash balance. This will not affect your existing
                holdings.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="cash">Cash Amount</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="cash"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={newCash}
                      onChange={e => setNewCash(e.target.value)}
                      className="pl-9"
                      disabled={isLoading}
                      required
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-red-600">{error}</p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Updating...' : 'Update'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-green-600">
          {formatCurrency(cashAvailable)}
        </div>
      </CardContent>
    </Card>
  );
}
