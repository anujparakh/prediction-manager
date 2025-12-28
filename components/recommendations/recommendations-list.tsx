'use client';

import { RecommendationCard } from './recommendation-card';
import type { Recommendation } from '@/lib/db/schema';
import { FileText } from 'lucide-react';

interface RecommendationsListProps {
  recommendations: Recommendation[];
  onUpdate: () => void;
  isLoading?: boolean;
}

export function RecommendationsList({
  recommendations,
  onUpdate,
  isLoading = false,
}: RecommendationsListProps) {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status" aria-label="Loading"></div>
        <p className="text-muted-foreground mt-4">Loading recommendations...</p>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-800/50 mb-4">
          <FileText className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No recommendations yet
        </h3>
        <p className="text-muted-foreground mb-6">
          Click "Evaluate Rules" to generate recommendations from your active rules.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {recommendations.map((recommendation) => (
        <RecommendationCard
          key={recommendation.id}
          recommendation={recommendation}
          onStatusChange={onUpdate}
        />
      ))}
    </div>
  );
}
