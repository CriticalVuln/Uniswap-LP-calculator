'use client';

import { useState } from 'react';
import { Github, ExternalLink, Activity, AlertTriangle, TrendingUp } from 'lucide-react';
import { PoolSearchForm } from '@/components/forms/PoolSearchForm';
import { APRResults } from '@/components/APRResults';
import { Card, CardContent } from '@/components/ui/card';
import { useAPRCalculation } from '@/hooks/useAPRCalculation';
import { PositionInput } from '@/types';
import { CHAINS } from '@/lib/constants';

export default function Home() {
  const [currentInput, setCurrentInput] = useState<PositionInput | null>(null);
    const { 
    data: aprData, 
    loading, 
    error, 
    subgraphLag, 
    usingFallback 
  } = useAPRCalculation(currentInput);

  const handleFormSubmit = (input: PositionInput) => {
    setCurrentInput(input);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Activity className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold">UniRange-Lite</h1>
                <p className="text-sm text-muted-foreground">Uniswap LP Calculator</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">              {/* Status indicators */}
              {usingFallback && (
                <div className="flex items-center space-x-2 text-yellow-500 text-sm">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                  <span>Using RPC fallback</span>
                </div>
              )}
              
              {!process.env.NEXT_PUBLIC_GRAPH_API_KEY && (
                <div className="flex items-center space-x-2 text-orange-500 text-sm">
                  <div className="w-2 h-2 bg-orange-500 rounded-full" />
                  <span>Rate limited (no API key)</span>
                </div>
              )}
              
              {process.env.NEXT_PUBLIC_GRAPH_API_KEY && (
                <div className="flex items-center space-x-2 text-green-500 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Unlimited access</span>
                </div>
              )}
              
              {subgraphLag > 0 && (
                <div className="text-xs text-muted-foreground">
                  Subgraph lag: {Math.floor(subgraphLag / 60)}m
                </div>
              )}
              
              <a
                href="https://github.com/yourusername/unirange-lite"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github className="h-5 w-5" />
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              Calculate Uniswap LP Returns
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Analyze liquidity position APR, APY, and projected revenues across 
              Ethereum, Arbitrum, Optimism, and Base with precise fee calculations.
            </p>
          </div>

          {/* Two-column layout */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left: Input Form */}
            <div className="space-y-6">
              <PoolSearchForm onSubmit={handleFormSubmit} loading={loading} />
              
              {/* Chain Status */}
              <div className="grid grid-cols-2 gap-4">
                {Object.values(CHAINS).map((chain) => (
                  <div 
                    key={chain.id}
                    className="p-3 rounded-lg border border-border bg-card/50"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-sm font-medium">{chain.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Subgraph: Active
                    </p>
                  </div>
                ))}
              </div>
            </div>            {/* Right: Results */}
            <div className="space-y-6">
              <APRResults 
                data={aprData}
                loading={loading}
                error={error}
                input={currentInput}
                subgraphLag={subgraphLag}
                usingFallback={usingFallback}
              />
            </div>
          </div>

          {/* Features Section */}
          <div className="mt-16 grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-lg border border-border bg-card/30">
              <Activity className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Accurate Calculations</h3>
              <p className="text-sm text-muted-foreground">
                Precise fee growth calculations using Uniswap's exact formulas and on-chain data.
              </p>
            </div>
            
            <div className="text-center p-6 rounded-lg border border-border bg-card/30">
              <ExternalLink className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Multi-Chain Support</h3>
              <p className="text-sm text-muted-foreground">
                Works across Ethereum, Arbitrum, Optimism, and Base with V3 and V4 support.
              </p>
            </div>
            
            <div className="text-center p-6 rounded-lg border border-border bg-card/30">
              <Github className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Open Source</h3>
              <p className="text-sm text-muted-foreground">
                MIT licensed and fully open source. Fork, modify, and deploy your own version.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center text-sm text-muted-foreground">
            <p>
              Built with Next.js, Tailwind CSS, and Viem. 
              Data from Uniswap subgraphs and on-chain sources.
            </p>
            <p className="mt-2">
              Not financial advice. Always do your own research.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}