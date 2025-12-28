'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCardSkeleton } from '@/components/ui/loading-skeleton';
import { ArrowLeft, Filter, AlertCircle } from 'lucide-react';
import { RecommendationsList } from '@/components/recommendations/recommendations-list';
import type { Recommendation, RecommendationStatus } from '@/lib/db/schema';

interface RecommendationStats {
  pending: number;
  executed: number;
  dismissed: number;
  total: number;
}

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [stats, setStats] = useState<RecommendationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<RecommendationStatus | 'ALL'>('ALL');

  useEffect(() => {
    fetchRecommendations();
  }, [selectedStatus]);

  const fetchRecommendations = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const url =
        selectedStatus === 'ALL'
          ? '/api/recommendations'
          : `/api/recommendations?status=${selectedStatus}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const data = await response.json() as {
        data: {
          recommendations: Recommendation[];
          stats: RecommendationStats;
        };
      };
      setRecommendations(data.data.recommendations || []);
      setStats(data.data.stats || null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch recommendations';
      setError(errorMessage);
      toast.error('Failed to load recommendations', {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusFilter = (status: RecommendationStatus | 'ALL') => {
    setSelectedStatus(status);
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-500 font-medium text-lg mb-2">Unable to load recommendations</p>
              <p className="text-sm text-gray-400 mb-6">
                {error || 'An unexpected error occurred. Please try again.'}
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={fetchRecommendations} variant="outline" className="hover:scale-105 transition-transform">
                  Try Again
                </Button>
                <Button onClick={() => window.location.reload()} className="hover:scale-105 transition-transform">
                  Reload Page
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2 mb-2 hover:scale-105 transition-transform">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-100">Recommendations</h1>
          <p className="text-gray-400 mt-2">
            Manage your trading recommendations from active rules
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      ) : stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card
            className={`cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl ${
              selectedStatus === 'ALL' ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => handleStatusFilter('ALL')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Badge variant="outline">{stats.total}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-100">{stats.total}</div>
              <p className="text-xs text-gray-400 mt-1">All recommendations</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl ${
              selectedStatus === 'PENDING' ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => handleStatusFilter('PENDING')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Badge variant="outline" className="bg-yellow-900/50 text-yellow-400 border-yellow-700">
                {stats.pending}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{stats.pending}</div>
              <p className="text-xs text-gray-400 mt-1">Awaiting action</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl ${
              selectedStatus === 'EXECUTED' ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => handleStatusFilter('EXECUTED')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Executed</CardTitle>
              <Badge variant="outline" className="bg-green-900/50 text-green-400 border-green-700">
                {stats.executed}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats.executed}</div>
              <p className="text-xs text-gray-400 mt-1">Completed trades</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl ${
              selectedStatus === 'DISMISSED' ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => handleStatusFilter('DISMISSED')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dismissed</CardTitle>
              <Badge variant="outline" className="bg-gray-800 text-gray-300 border-gray-700">
                {stats.dismissed}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-400">{stats.dismissed}</div>
              <p className="text-xs text-gray-400 mt-1">Declined</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter Info */}
      <Card className="bg-gray-900/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-300">
              Showing:{' '}
              <span className="font-medium text-gray-100">
                {selectedStatus === 'ALL' ? 'All Recommendations' : `${selectedStatus} Recommendations`}
              </span>
            </span>
            {selectedStatus !== 'ALL' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleStatusFilter('ALL')}
                className="text-xs hover:scale-105 transition-transform"
              >
                Clear filter
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {selectedStatus === 'ALL'
                ? 'All Recommendations'
                : `${selectedStatus} Recommendations`}
            </CardTitle>
            <Badge variant="outline">{recommendations.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <RecommendationsList
            recommendations={recommendations}
            onUpdate={fetchRecommendations}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
