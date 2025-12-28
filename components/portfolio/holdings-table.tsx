'use client';

import Link from 'next/link';
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
import { Briefcase, Plus } from 'lucide-react';

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

interface HoldingsTableProps {
  holdings: Holding[];
}

export function HoldingsTable({ holdings }: HoldingsTableProps) {
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

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (holdings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-950/50 mb-4">
              <Briefcase className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No holdings yet
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Add your first transaction to start building your portfolio and tracking performance
            </p>
            <Link href="/transactions">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Transaction
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Holdings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Avg Cost</TableHead>
                <TableHead className="text-right">Current Price</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead className="text-right">P&amp;L</TableHead>
                <TableHead className="text-right">P&amp;L %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holdings.map(holding => {
                const isProfitable = holding.profit_loss >= 0;
                const plColor = isProfitable
                  ? 'text-green-600'
                  : 'text-red-600';

                return (
                  <TableRow key={holding.symbol}>
                    <TableCell className="font-medium">
                      {holding.symbol}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(holding.quantity)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(holding.average_price)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(holding.current_price)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(holding.total_cost)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(holding.total_value)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${plColor}`}>
                      {isProfitable ? '+' : ''}
                      {formatCurrency(holding.profit_loss)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${plColor}`}>
                      {isProfitable ? '+' : ''}
                      {formatPercent(holding.profit_loss_percent)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
