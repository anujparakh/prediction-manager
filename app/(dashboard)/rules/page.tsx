'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { TableSkeleton } from '@/components/ui/loading-skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Edit, Trash2, AlertCircle, ListChecks } from 'lucide-react';
import type { Rule } from '@/lib/db/schema';

export default function RulesPage() {
  const router = useRouter();
  const [rules, setRules] = useState<Rule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<Rule | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchRules = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/rules');
      if (!response.ok) {
        const data = await response.json() as { message?: string };
        throw new Error(data.message || 'Failed to fetch rules');
      }

      const data = await response.json() as { data: Rule[] };
      setRules(data.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch rules';
      setError(errorMessage);
      toast.error('Failed to load rules', {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleToggleActive = async (rule: Rule) => {
    try {
      const response = await fetch(`/api/rules/${rule.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: !rule.is_active,
        }),
      });

      if (!response.ok) {
        const data = await response.json() as { message?: string };
        throw new Error(data.message || 'Failed to update rule');
      }

      const newStatus = !rule.is_active;
      toast.success(`Rule ${newStatus ? 'activated' : 'deactivated'}`, {
        description: `${rule.name} is now ${newStatus ? 'active' : 'inactive'}`,
      });

      // Update the rule in the local state
      setRules((prevRules) =>
        prevRules.map((r) =>
          r.id === rule.id ? { ...r, is_active: r.is_active ? 0 : 1 } : r
        )
      );
    } catch (err) {
      console.error('Error toggling rule:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update rule';

      toast.error('Failed to update rule', {
        description: errorMessage,
      });
    }
  };

  const handleDeleteClick = (rule: Rule) => {
    setRuleToDelete(rule);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!ruleToDelete) return;

    try {
      setIsDeleting(true);

      const response = await fetch(`/api/rules/${ruleToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json() as { message?: string };
        throw new Error(data.message || 'Failed to delete rule');
      }

      toast.success('Rule deleted successfully', {
        description: `${ruleToDelete.name} has been removed`,
      });

      // Remove the rule from the local state
      setRules((prevRules) => prevRules.filter((r) => r.id !== ruleToDelete.id));
      setDeleteDialogOpen(false);
      setRuleToDelete(null);
    } catch (err) {
      console.error('Error deleting rule:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete rule';

      toast.error('Failed to delete rule', {
        description: errorMessage,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-100">Trading Rules</h1>
          <Link href="/rules/new">
            <Button className="gap-2" disabled>
              <Plus className="w-4 h-4" />
              New Rule
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="pt-6">
            <TableSkeleton rows={5} columns={7} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-100">Trading Rules</h1>
          <Link href="/rules/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Rule
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-500 font-medium">Error loading rules</p>
              <p className="text-sm text-gray-400 mt-2">{error}</p>
              <Button onClick={fetchRules} className="mt-4">
                Try Again
              </Button>
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
        <h1 className="text-3xl font-bold text-gray-100">Trading Rules</h1>
        <Link href="/rules/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Rule
          </Button>
        </Link>
      </div>

      {/* Rules Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Rules ({rules.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-950/50 mb-4">
                <ListChecks className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-100 mb-2">
                No trading rules yet
              </h3>
              <p className="text-sm text-gray-400 mb-6">
                Create rules to automatically generate trading recommendations based on technical indicators
              </p>
              <Link href="/rules/new">
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Your First Rule
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Expression</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{rule.symbol}</Badge>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-gray-800 text-blue-300 px-2 py-1 rounded font-mono">
                        {rule.expression.length > 50
                          ? `${rule.expression.substring(0, 50)}...`
                          : rule.expression}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={rule.action === 'BUY' ? 'default' : 'outline'}
                        className={
                          rule.action === 'BUY'
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-red-600 hover:bg-red-700 text-white'
                        }
                      >
                        {rule.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={rule.is_active === 1}
                          onCheckedChange={() => handleToggleActive(rule)}
                        />
                        <span className="text-sm text-muted-foreground">
                          {rule.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(rule.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/rules/${rule.id}`)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteClick(rule)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Rule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the rule &quot;{ruleToDelete?.name}&quot;?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
