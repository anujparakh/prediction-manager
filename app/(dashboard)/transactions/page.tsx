'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TableSkeleton } from '@/components/ui/loading-skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TransactionHistory } from '@/components/transactions/transaction-history';
import { AddTransactionDialog } from '@/components/transactions/add-transaction-dialog';
import { Briefcase, Filter, X, AlertCircle } from 'lucide-react';

interface Transaction {
  id: string;
  symbol: string;
  transaction_type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  total_amount: number;
  transaction_date: number;
  notes: string | null;
  created_at: number;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filter states
  const [symbolFilter, setSymbolFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Calculate max date client-side only to avoid hydration mismatch
  const maxDate = useMemo(() => new Date().toISOString().split('T')[0], []);

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query params
      const params = new URLSearchParams();
      if (symbolFilter) params.append('symbol', symbolFilter.toUpperCase());
      if (typeFilter) params.append('transaction_type', typeFilter);
      if (startDate) {
        const startTimestamp = new Date(startDate).getTime();
        params.append('start_date', startTimestamp.toString());
      }
      if (endDate) {
        const endTimestamp = new Date(endDate).setHours(23, 59, 59, 999);
        params.append('end_date', endTimestamp.toString());
      }

      const url = `/api/transactions${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        const data = await response.json() as { message?: string };
        throw new Error(data.message || 'Failed to fetch transactions');
      }

      const data = await response.json() as { data: any[] };
      setTransactions(data.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch transactions';
      setError(errorMessage);
      toast.error('Failed to load transactions', {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [symbolFilter, typeFilter, startDate, endDate]);

  const handleTransactionDeleted = (transactionId: string) => {
    // Remove the deleted transaction from the list
    setTransactions(prev => prev.filter(t => t.id !== transactionId));
  };

  const handleClearFilters = () => {
    setSymbolFilter('');
    setTypeFilter('');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = symbolFilter || typeFilter || startDate || endDate;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-100">Transactions</h1>
        <div className="flex items-center gap-3">
          <Link href="/portfolio">
            <Button variant="outline" className="gap-2">
              <Briefcase className="w-4 h-4" />
              View Portfolio
            </Button>
          </Link>
          <AddTransactionDialog onSuccess={fetchTransactions} />
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Filters</CardTitle>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  Clear
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="w-4 h-4" />
                {showFilters ? 'Hide' : 'Show'}
              </Button>
            </div>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Symbol Filter */}
              <div className="space-y-2">
                <Label htmlFor="symbol-filter">Symbol</Label>
                <Input
                  id="symbol-filter"
                  placeholder="e.g., AAPL"
                  value={symbolFilter}
                  onChange={e => setSymbolFilter(e.target.value.toUpperCase())}
                />
              </div>

              {/* Type Filter */}
              <div className="space-y-2">
                <Label htmlFor="type-filter">Type</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger id="type-filter">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    <SelectItem value="BUY">BUY</SelectItem>
                    <SelectItem value="SELL">SELL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Start Date Filter */}
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  max={endDate || maxDate}
                />
              </div>

              {/* End Date Filter */}
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  min={startDate}
                  max={maxDate}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Results Count */}
      {!isLoading && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}{' '}
            {hasActiveFilters ? 'found' : 'total'}
          </p>
        </div>
      )}

      {/* Transactions Table */}
      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <TableSkeleton rows={8} columns={7} />
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-500 font-medium text-lg mb-2">Unable to load transactions</p>
              <p className="text-sm text-gray-400 mb-6">
                {error || 'An unexpected error occurred. Please try again.'}
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={fetchTransactions} variant="outline">
                  Try Again
                </Button>
                <Button onClick={() => window.location.reload()}>
                  Reload Page
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <TransactionHistory
          transactions={transactions}
          onDelete={handleTransactionDeleted}
        />
      )}
    </div>
  );
}
