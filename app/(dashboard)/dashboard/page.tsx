'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DashboardSkeleton } from '@/components/ui/loading-skeleton';
import {
  Briefcase,
  ArrowLeftRight,
  TrendingUp,
  DollarSign,
  Sparkles,
  ListChecks,
  AlertCircle,
} from 'lucide-react';
import { RecommendationsList } from '@/components/recommendations/recommendations-list';
import type { Recommendation } from '@/lib/db/schema';

interface DashboardStats {
  cash_available: number;
  total_value: number;
  holdings_count: number;
  total_profit_loss: number;
  total_profit_loss_percent: number;
  recent_transactions_count: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationMessage, setEvaluationMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch portfolio data
        const portfolioResponse = await fetch('/api/portfolio');
        if (!portfolioResponse.ok) {
          throw new Error('Failed to fetch portfolio');
        }
        const portfolioData = await portfolioResponse.json() as {
          data: {
            cash_available: number;
            total_value: number;
            holdings: any[];
            total_profit_loss: number;
            total_profit_loss_percent: number;
          };
        };

        // Fetch recent transactions count
        const transactionsResponse = await fetch('/api/transactions?limit=10');
        if (!transactionsResponse.ok) {
          throw new Error('Failed to fetch transactions');
        }
        const transactionsData = await transactionsResponse.json() as { count: number };

        setStats({
          cash_available: portfolioData.data.cash_available,
          total_value: portfolioData.data.total_value,
          holdings_count: portfolioData.data.holdings.length,
          total_profit_loss: portfolioData.data.total_profit_loss,
          total_profit_loss_percent: portfolioData.data.total_profit_loss_percent,
          recent_transactions_count: transactionsData.count,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch dashboard data';
        setError(errorMessage);
        toast.error('Failed to load dashboard', {
          description: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      setIsLoadingRecommendations(true);
      const response = await fetch('/api/recommendations?status=PENDING');
      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }
      const data = await response.json() as {
        data: {
          recommendations: Recommendation[];
        };
      };
      setRecommendations(data.data.recommendations || []);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  const handleEvaluateRules = async () => {
    try {
      setIsEvaluating(true);
      setEvaluationMessage(null);

      const response = await fetch('/api/rules/evaluate', {
        method: 'POST',
      });

      const data = await response.json() as {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.message || 'Failed to evaluate rules');
      }

      const successMessage = data.message || 'Rules evaluated successfully';
      setEvaluationMessage(successMessage);
      toast.success('Rules evaluated', {
        description: successMessage,
      });

      // Refresh recommendations
      await fetchRecommendations();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to evaluate rules';
      setEvaluationMessage(errorMessage);
      toast.error('Evaluation failed', {
        description: errorMessage,
      });
    } finally {
      setIsEvaluating(false);
    }
  };

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

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error || !stats) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-100">Dashboard</h1>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-500 font-medium text-lg mb-2">Error loading dashboard</p>
              <p className="text-sm text-gray-400 mb-6">{error}</p>
              <Button onClick={() => window.location.reload()} className="hover:scale-105 transition-transform">
                Reload Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isProfitable = stats.total_profit_loss >= 0;
  const plColor = isProfitable ? 'text-green-600' : 'text-red-600';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-100">Dashboard</h1>
        <p className="text-gray-400 mt-2">
          Welcome to Financier
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Cash Available */}
        <Card className="hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Available</CardTitle>
            <DollarSign className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {formatCurrency(stats.cash_available)}
            </div>
          </CardContent>
        </Card>

        {/* Total Portfolio Value */}
        <Card className="hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Portfolio Value
            </CardTitle>
            <Briefcase className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-100">
              {formatCurrency(stats.total_value)}
            </div>
          </CardContent>
        </Card>

        {/* Holdings Count */}
        <Card className="hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Holdings</CardTitle>
            <TrendingUp className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-100">{stats.holdings_count}</div>
            <p className="text-xs text-gray-400 mt-1">
              {stats.holdings_count === 1 ? 'stock' : 'stocks'}
            </p>
          </CardContent>
        </Card>

        {/* Total P&L */}
        <Card className="hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total P&amp;L</CardTitle>
            <ArrowLeftRight className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${plColor}`}>
              {isProfitable ? '+' : ''}
              {formatCurrency(stats.total_profit_loss)}
            </div>
            <p className={`text-xs ${plColor} mt-1`}>
              {isProfitable ? '+' : ''}
              {formatPercent(stats.total_profit_loss_percent)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full justify-start gap-3 hover:scale-[1.02] transition-transform"
              variant="outline"
              onClick={handleEvaluateRules}
              disabled={isEvaluating}
            >
              <Sparkles className="w-5 h-5" />
              {isEvaluating ? 'Evaluating Rules...' : 'Evaluate Rules'}
            </Button>
            <Link href="/portfolio" className="block">
              <Button className="w-full justify-start gap-3 hover:scale-[1.02] transition-transform" variant="outline">
                <Briefcase className="w-5 h-5" />
                View Portfolio
              </Button>
            </Link>
            <Link href="/transactions/new" className="block">
              <Button className="w-full justify-start gap-3 hover:scale-[1.02] transition-transform" variant="outline">
                <ArrowLeftRight className="w-5 h-5" />
                Add Transaction
              </Button>
            </Link>
            <Link href="/transactions" className="block">
              <Button className="w-full justify-start gap-3 hover:scale-[1.02] transition-transform" variant="outline">
                <ArrowLeftRight className="w-5 h-5" />
                View All Transactions
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Recent Transactions</span>
                <span className="font-medium text-gray-100">{stats.recent_transactions_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Pending Recommendations</span>
                <Badge variant="outline">{recommendations.length}</Badge>
              </div>
              <Link href="/transactions">
                <Button variant="outline" className="w-full hover:scale-[1.02] transition-transform">
                  View All Transactions
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Evaluation Message */}
      {evaluationMessage && (
        <Card className="border-blue-800 bg-blue-950/50">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-200">{evaluationMessage}</p>
          </CardContent>
        </Card>
      )}

      {/* Today's Recommendations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ListChecks className="w-5 h-5 text-gray-400" />
              <CardTitle>Today&apos;s Recommendations</CardTitle>
            </div>
            {recommendations.length > 0 && (
              <Link href="/recommendations">
                <Button variant="outline" size="sm" className="hover:scale-105 transition-transform">
                  View All
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <RecommendationsList
            recommendations={recommendations.slice(0, 3)}
            onUpdate={fetchRecommendations}
            isLoading={isLoadingRecommendations}
          />
          {recommendations.length > 3 && (
            <div className="mt-6 text-center">
              <Link href="/recommendations">
                <Button variant="outline" className="hover:scale-105 transition-transform">
                  View All {recommendations.length} Recommendations
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
