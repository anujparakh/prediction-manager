'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatCardSkeleton } from '@/components/ui/loading-skeleton';
import { HoldingsTable } from '@/components/portfolio/holdings-table';
import { CashDisplay } from '@/components/portfolio/cash-display';
import { ArrowLeftRight, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface Holding {
  symbol: string;
  quantity: number;
  average_price: number;
  current_price: number;
  total_cost: number;
  total_value: number;
  profit_loss: number;
  profit_loss_percent: number;
}

interface PortfolioData {
  cash_available: number;
  holdings: Holding[];
  total_invested: number;
  total_value: number;
  total_profit_loss: number;
  total_profit_loss_percent: number;
}

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolio = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/portfolio');
      if (!response.ok) {
        const data = await response.json() as { message?: string };
        throw new Error(data.message || 'Failed to fetch portfolio');
      }

      const data = await response.json() as { data: any };
      setPortfolio(data.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch portfolio';
      setError(errorMessage);
      toast.error('Failed to load portfolio', {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value / 100);
  };

  const handleCashUpdate = (newCash: number) => {
    if (portfolio) {
      // Update portfolio with new cash
      const newTotalValue =
        newCash + portfolio.holdings.reduce((sum, h) => sum + h.total_value, 0);
      setPortfolio({
        ...portfolio,
        cash_available: newCash,
        total_value: newTotalValue,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-100">Portfolio</h1>
          <Link href="/transactions">
            <Button className="gap-2" disabled>
              <ArrowLeftRight className="w-4 h-4" />
              View Transactions
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-100">Portfolio</h1>
          <Link href="/transactions">
            <Button className="gap-2">
              <ArrowLeftRight className="w-4 h-4" />
              View Transactions
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-500 font-medium text-lg mb-2">Unable to load portfolio</p>
              <p className="text-sm text-gray-400 mb-6">
                {error || 'An unexpected error occurred. Please try again.'}
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={fetchPortfolio} variant="outline">
                  Try Again
                </Button>
                <Button onClick={() => window.location.reload()}>
                  Reload Page
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!portfolio) {
    return null;
  }

  const isProfitable = portfolio.total_profit_loss >= 0;
  const plColor = isProfitable ? 'text-green-600' : 'text-red-600';
  const TrendIcon = isProfitable ? TrendingUp : TrendingDown;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-100">Portfolio</h1>
        <Link href="/transactions">
          <Button className="gap-2">
            <ArrowLeftRight className="w-4 h-4" />
            View Transactions
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Cash Available */}
        <CashDisplay
          cashAvailable={portfolio.cash_available}
          onUpdate={handleCashUpdate}
        />

        {/* Total Portfolio Value */}
        <Card className="hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Portfolio Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-100">
              {formatCurrency(portfolio.total_value)}
            </div>
          </CardContent>
        </Card>

        {/* Total Invested */}
        <Card className="hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Invested
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-100">
              {formatCurrency(portfolio.total_invested)}
            </div>
          </CardContent>
        </Card>

        {/* Total P&L */}
        <Card className="hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total P&amp;L</CardTitle>
            <TrendIcon className={`w-4 h-4 ${plColor}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${plColor}`}>
              {isProfitable ? '+' : ''}
              {formatCurrency(portfolio.total_profit_loss)}
            </div>
            <p className={`text-sm ${plColor} mt-1`}>
              {isProfitable ? '+' : ''}
              {formatPercent(portfolio.total_profit_loss_percent)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Holdings Table */}
      <HoldingsTable holdings={portfolio.holdings} />
    </div>
  );
}
