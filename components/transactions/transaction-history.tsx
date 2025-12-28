'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Trash2, Receipt } from 'lucide-react';

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

interface TransactionHistoryProps {
  transactions: Transaction[];
  onDelete?: (transactionId: string) => void;
}

export function TransactionHistory({
  transactions,
  onDelete,
}: TransactionHistoryProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/transactions/${deleteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json() as { message?: string };
        throw new Error(data.message || 'Failed to delete transaction');
      }

      toast.success('Transaction deleted successfully', {
        description: 'Cash balance has been updated',
      });

      // Call onDelete callback if provided
      if (onDelete) {
        onDelete(deleteId);
      }

      setDeleteId(null);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete transaction';

      toast.error('Failed to delete transaction', {
        description: errorMessage,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-800/50 mb-4">
              <Receipt className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No transactions yet
            </h3>
            <p className="text-sm text-muted-foreground">
              Add your first transaction to start tracking your portfolio
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map(transaction => {
                  const isBuy = transaction.transaction_type === 'BUY';

                  return (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {format(
                          new Date(transaction.transaction_date),
                          'MMM d, yyyy'
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {transaction.symbol}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={isBuy ? 'default' : 'secondary'}
                          className={
                            isBuy
                              ? 'bg-green-900/50 text-green-400 hover:bg-green-900/70 border-green-800'
                              : 'bg-red-900/50 text-red-400 hover:bg-red-900/70 border-red-800'
                          }
                        >
                          {transaction.transaction_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(transaction.quantity)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(transaction.price)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(transaction.total_amount)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {transaction.notes || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(transaction.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-950/50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transaction</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this transaction? This will
              reverse the cash balance change. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
