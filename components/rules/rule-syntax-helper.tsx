'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { useState } from 'react';

interface Example {
  title: string;
  expression: string;
  description: string;
}

const examples: Example[] = [
  {
    title: 'RSI Oversold',
    expression: 'RSI(14) < 30',
    description: 'Buy when RSI is below 30 (oversold condition)',
  },
  {
    title: 'RSI Overbought',
    expression: 'RSI(14) > 70',
    description: 'Sell when RSI is above 70 (overbought condition)',
  },
  {
    title: 'Price Above Moving Average',
    expression: 'close > SMA(50)',
    description: 'Buy when price crosses above 50-day simple moving average',
  },
  {
    title: 'Golden Cross',
    expression: 'SMA(50) > SMA(200)',
    description: 'Buy when 50-day MA crosses above 200-day MA',
  },
  {
    title: 'Volume Spike',
    expression: 'volume > avgVolume(20) * 2',
    description: 'Trigger when volume is 2x the 20-day average',
  },
  {
    title: 'Combined Conditions',
    expression: 'RSI(14) < 30 AND volume > avgVolume(20)',
    description: 'Buy when RSI is oversold AND volume is above average',
  },
  {
    title: 'Multiple Indicators',
    expression: '(RSI(14) < 30 OR close < SMA(50)) AND volume > avgVolume(20)',
    description: 'Complex rule with multiple conditions',
  },
];

const functions = [
  { name: 'RSI(period)', description: 'Relative Strength Index', example: 'RSI(14)' },
  { name: 'SMA(period)', description: 'Simple Moving Average', example: 'SMA(50)' },
  { name: 'EMA(period)', description: 'Exponential Moving Average', example: 'EMA(20)' },
  { name: 'avgVolume(period)', description: 'Average Volume', example: 'avgVolume(20)' },
];

const properties = [
  { name: 'close', description: 'Current closing price' },
  { name: 'open', description: 'Current opening price' },
  { name: 'high', description: 'Current high price' },
  { name: 'low', description: 'Current low price' },
  { name: 'volume', description: 'Current trading volume' },
  { name: 'price', description: 'Alias for close price' },
];

const operators = [
  { symbol: '<', description: 'Less than' },
  { symbol: '>', description: 'Greater than' },
  { symbol: '<=', description: 'Less than or equal to' },
  { symbol: '>=', description: 'Greater than or equal to' },
  { symbol: '==', description: 'Equal to' },
  { symbol: '!=', description: 'Not equal to' },
  { symbol: 'AND', description: 'Logical AND' },
  { symbol: 'OR', description: 'Logical OR' },
  { symbol: 'NOT', description: 'Logical NOT' },
];

interface RuleSyntaxHelperProps {
  onExampleClick?: (expression: string) => void;
}

export function RuleSyntaxHelper({ onExampleClick }: RuleSyntaxHelperProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (expression: string, index: number) => {
    await navigator.clipboard.writeText(expression);
    setCopiedIndex(index);

    if (onExampleClick) {
      onExampleClick(expression);
    }

    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Syntax Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Syntax Reference</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Functions */}
          <div>
            <h4 className="font-semibold text-sm mb-2 text-gray-100">Functions</h4>
            <div className="space-y-1 text-sm">
              {functions.map((func) => (
                <div key={func.name} className="flex justify-between items-start">
                  <div>
                    <code className="bg-gray-800 px-2 py-1 rounded font-mono text-xs text-blue-400">
                      {func.name}
                    </code>
                    <span className="text-gray-300 ml-2">{func.description}</span>
                  </div>
                  <code className="text-xs text-gray-400 font-mono">
                    {func.example}
                  </code>
                </div>
              ))}
            </div>
          </div>

          {/* Properties */}
          <div>
            <h4 className="font-semibold text-sm mb-2 text-gray-100">Properties</h4>
            <div className="space-y-1 text-sm">
              {properties.map((prop) => (
                <div key={prop.name} className="flex items-start">
                  <code className="bg-gray-800 px-2 py-1 rounded font-mono text-xs text-green-400">
                    {prop.name}
                  </code>
                  <span className="text-gray-300 ml-2">{prop.description}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Operators */}
          <div>
            <h4 className="font-semibold text-sm mb-2 text-gray-100">Operators</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {operators.map((op) => (
                <div key={op.symbol} className="flex items-start">
                  <code className="bg-gray-800 px-2 py-1 rounded font-mono text-xs w-16 text-purple-400">
                    {op.symbol}
                  </code>
                  <span className="text-gray-300 ml-2">{op.description}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Examples */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Example Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {examples.map((example, index) => (
            <div
              key={index}
              className="border border-gray-700 rounded-lg p-3 hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h5 className="font-semibold text-sm mb-1 text-gray-100">{example.title}</h5>
                  <code className="text-xs bg-gray-800 text-blue-300 px-2 py-1 rounded block font-mono mb-2 break-all">
                    {example.expression}
                  </code>
                  <p className="text-xs text-gray-400">{example.description}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(example.expression, index)}
                  className="shrink-0"
                >
                  {copiedIndex === index ? (
                    <span className="text-xs">Copied!</span>
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
