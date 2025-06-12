'use client';

import { useState } from 'react';
import { Copy, Share2, TrendingUp, DollarSign, Calendar, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { APRData } from '@/types';
import { formatNumber, formatPercentage } from '@/utils/calculations';
import { cn } from '@/lib/utils';

interface APRResultsProps {
  data: APRData | null;
  loading?: boolean;
  error?: string | null;
  input?: any;
  subgraphLag?: number;
  usingFallback?: boolean;
  poolInfo?: {
    token0Symbol: string;
    token1Symbol: string;
    fee: number;
    chainName: string;
  };
}

export function APRResults({ data, loading, error, input, subgraphLag = 0, usingFallback = false, poolInfo }: APRResultsProps) {
  const [copied, setCopied] = useState(false);

  // Show loading state
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calculating APR...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Calculation Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  // Show empty state
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>APR & Fee Calculator</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-12">
            Configure your position to see APR calculations and projected earnings.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Generate CSV data
  const generateCSV = () => {
    const headers = ['Timeframe', 'APR', 'APY', 'Monthly Revenue (USD)', 'Yearly Revenue (USD)'];
    const rows = [
      ['24h', formatPercentage(data.apr24h), formatPercentage(data.apy24h), formatNumber(data.monthlyRevenueUSD), formatNumber(data.yearlyRevenueUSD)],
      ['7d', formatPercentage(data.apr7d), formatPercentage(data.apy7d), formatNumber(data.monthlyRevenueUSD), formatNumber(data.yearlyRevenueUSD)],
      ['30d', formatPercentage(data.apr30d), formatPercentage(data.apy30d), formatNumber(data.monthlyRevenueUSD), formatNumber(data.yearlyRevenueUSD)],
    ];
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  // Copy CSV to clipboard
  const copyCSV = async () => {
    try {
      await navigator.clipboard.writeText(generateCSV());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy CSV:', error);
    }
  };

  // Share permalink
  const sharePermalink = async () => {
    const url = new URL(window.location.href);
    // Would add query parameters for the current configuration
    try {
      await navigator.clipboard.writeText(url.toString());
      // Could also use Web Share API
    } catch (error) {
      console.error('Failed to share permalink:', error);
    }
  };

  return (
    <div className="w-full max-w-4xl space-y-6">
      {/* Warnings */}
      {(subgraphLag > 30 * 60 || usingFallback) && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-yellow-200">Data Quality Notice</p>
                {subgraphLag > 30 * 60 && (
                  <p className="text-sm text-yellow-300">
                    Subgraph data is {Math.floor(subgraphLag / 60)} minutes behind. Using RPC fallback for accuracy.
                  </p>
                )}
                {usingFallback && (
                  <p className="text-sm text-yellow-300">
                    Using blockchain RPC data due to subgraph issues. Calculations may take longer.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pool Info Header */}
      {poolInfo && (
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">
                  {poolInfo.token0Symbol}/{poolInfo.token1Symbol}
                </h2>
                <p className="text-muted-foreground">
                  {(poolInfo.fee / 10000).toFixed(2)}% fee • {poolInfo.chainName}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyCSV}>
                  <Copy className="w-4 h-4 mr-2" />
                  {copied ? 'Copied!' : 'Copy CSV'}
                </Button>
                <Button variant="outline" size="sm" onClick={sharePermalink}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* APR/APY Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <APRCard
          title="24 Hour"
          apr={data.apr24h}
          apy={data.apy24h}
          icon={<TrendingUp className="w-5 h-5" />}
          variant="primary"
        />
        <APRCard
          title="7 Day"
          apr={data.apr7d}
          apy={data.apy7d}
          icon={<TrendingUp className="w-5 h-5" />}
          variant="secondary"
        />
        <APRCard
          title="30 Day"
          apr={data.apr30d}
          apy={data.apy30d}
          icon={<TrendingUp className="w-5 h-5" />}
          variant="accent"
        />
      </div>

      {/* Revenue Projections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="w-5 h-5" />
              Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-accent">
              ${formatNumber(data.monthlyRevenueUSD)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Projected monthly fee earnings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="w-5 h-5" />
              Yearly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-accent">
              ${formatNumber(data.yearlyRevenueUSD)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Projected yearly fee earnings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2">Timeframe</th>
                  <th className="text-right py-2">APR</th>
                  <th className="text-right py-2">APY (Daily Compound)</th>
                  <th className="text-right py-2">Monthly Revenue</th>
                  <th className="text-right py-2">Yearly Revenue</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-3 font-medium">24 Hour</td>
                  <td className="text-right py-3">{formatPercentage(data.apr24h)}</td>
                  <td className="text-right py-3">{formatPercentage(data.apy24h)}</td>
                  <td className="text-right py-3">${formatNumber(data.monthlyRevenueUSD)}</td>
                  <td className="text-right py-3">${formatNumber(data.yearlyRevenueUSD)}</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-3 font-medium">7 Day</td>
                  <td className="text-right py-3">{formatPercentage(data.apr7d)}</td>
                  <td className="text-right py-3">{formatPercentage(data.apy7d)}</td>
                  <td className="text-right py-3">${formatNumber(data.monthlyRevenueUSD)}</td>
                  <td className="text-right py-3">${formatNumber(data.yearlyRevenueUSD)}</td>
                </tr>
                <tr>
                  <td className="py-3 font-medium">30 Day</td>
                  <td className="text-right py-3">{formatPercentage(data.apr30d)}</td>
                  <td className="text-right py-3">{formatPercentage(data.apy30d)}</td>
                  <td className="text-right py-3">${formatNumber(data.monthlyRevenueUSD)}</td>
                  <td className="text-right py-3">${formatNumber(data.yearlyRevenueUSD)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Methodology */}
      <Card>
        <CardHeader>
          <CardTitle>Calculation Methodology</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>APR Calculation:</strong> (ΔfeeGrowthInside × liquidity / 2^128 × priceUSD) ÷ positionUSD × 365
          </p>
          <p>
            <strong>APY Calculation:</strong> (1 + APR/365)^365 − 1 (compounded daily)
          </p>
          <p>
            <strong>Data Sources:</strong> Uniswap subgraphs with RPC fallback for real-time accuracy
          </p>
          <p>
            <strong>Price Data:</strong> On-chain TWAP × Chainlink ETH/USD feed
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

interface APRCardProps {
  title: string;
  apr: number;
  apy: number;
  icon: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent';
}

function APRCard({ title, apr, apy, icon, variant = 'primary' }: APRCardProps) {
  return (
    <Card className={cn(
      "relative overflow-hidden",
      variant === 'primary' && "border-primary/50 bg-primary/5",
      variant === 'secondary' && "border-secondary/50 bg-secondary/5",
      variant === 'accent' && "border-accent/50 bg-accent/5"
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div>
            <div className="text-sm text-muted-foreground">APR</div>
            <div className={cn(
              "text-2xl font-bold",
              variant === 'primary' && "text-primary",
              variant === 'secondary' && "text-secondary-foreground",
              variant === 'accent' && "text-accent"
            )}>
              {formatPercentage(apr)}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">APY (Daily Compound)</div>
            <div className="text-lg font-semibold">
              {formatPercentage(apy)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
