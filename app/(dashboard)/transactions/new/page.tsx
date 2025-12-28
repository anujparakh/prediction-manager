'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const transactionSchema = z.object({
  symbol: z
    .string()
    .min(1, 'Symbol is required')
    .max(10, 'Symbol must be 10 characters or less')
    .regex(/^[A-Z]+$/, 'Symbol must contain only uppercase letters')
    .transform(val => val.toUpperCase()),
  transaction_type: z.enum(['BUY', 'SELL']).describe('Transaction type is required'),
  quantity: z
    .number()
    .positive('Quantity must be positive')
    .finite('Quantity must be a valid number'),
  price: z
    .number()
    .positive('Price must be positive')
    .finite('Price must be a valid number'),
  transaction_date: z.string().optional(),
  notes: z.string().max(500, 'Notes must be 500 characters or less').optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

export default function NewTransactionPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate max date client-side only to avoid hydration mismatch
  const maxDate = useMemo(() => new Date().toISOString().split('T')[0], []);

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      symbol: '',
      transaction_type: 'BUY',
      quantity: undefined,
      price: undefined,
      transaction_date: '',
      notes: '',
    },
  });

  const onSubmit = async (data: TransactionFormData) => {
    setIsSubmitting(true);
    try {
      // Convert date to Unix timestamp if provided
      let transactionDate: number | undefined;
      if (data.transaction_date) {
        transactionDate = new Date(data.transaction_date).getTime();
      }

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: data.symbol,
          transaction_type: data.transaction_type,
          quantity: data.quantity,
          price: data.price,
          transaction_date: transactionDate,
          notes: data.notes || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json() as { message?: string };
        throw new Error(errorData.message || 'Failed to create transaction');
      }

      // Success - redirect to transactions page
      router.push('/transactions');
    } catch (error) {
      console.error('Error creating transaction:', error);
      form.setError('root', {
        type: 'manual',
        message: error instanceof Error ? error.message : 'Failed to create transaction',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const watchedValues = form.watch();
  const totalAmount =
    watchedValues.quantity && watchedValues.price
      ? watchedValues.quantity * watchedValues.price
      : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/transactions">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-foreground">New Transaction</h1>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="symbol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Symbol</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="AAPL"
                        {...field}
                        onChange={e =>
                          field.onChange(e.target.value.toUpperCase())
                        }
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>
                      Stock ticker symbol (e.g., AAPL, GOOGL, MSFT)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="transaction_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select transaction type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="BUY">BUY</SelectItem>
                        <SelectItem value="SELL">SELL</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Buy to purchase shares, sell to liquidate
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="10"
                          {...field}
                          onChange={e =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          value={field.value ?? ''}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormDescription>Number of shares</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price per Share</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="150.00"
                          {...field}
                          onChange={e =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          value={field.value ?? ''}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormDescription>Price per share ($)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {totalAmount > 0 && (
                <div className="rounded-lg bg-blue-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-900">
                      Total Amount:
                    </span>
                    <span className="text-lg font-bold text-blue-900">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="transaction_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction Date (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        disabled={isSubmitting}
                        max={maxDate}
                      />
                    </FormControl>
                    <FormDescription>
                      Leave blank to use current date and time
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any notes about this transaction..."
                        {...field}
                        disabled={isSubmitting}
                        rows={4}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional notes or comments about this transaction
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.formState.errors.root && (
                <div className="rounded-lg bg-red-50 p-4">
                  <p className="text-sm text-red-600">
                    {form.formState.errors.root.message}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-4 pt-4">
                <Link href="/transactions">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Transaction'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
