'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronDown, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CHAINS, COMMON_TOKENS, FEE_TIERS } from '@/lib/constants';
import { searchPools, getPopularPools, getPoolByTokens } from '@/lib/subgraph';
import { ChainId, Pool, PositionInput, Token } from '@/types';
import { cn } from '@/lib/utils';
import { 
  tickToReadablePrice, 
  readablePriceToTick, 
  getCurrentPoolPrice, 
  shouldInvertDisplay, 
  formatPrice, 
  getPriceRangeSuggestions,
  validatePriceRange 
} from '@/utils/priceConversion';

interface PoolSearchFormProps {
  onSubmit: (input: PositionInput) => void;
  loading?: boolean;
}

type UniswapVersion = 'v3' | 'v4';

export function PoolSearchForm({ onSubmit, loading }: PoolSearchFormProps) {
  const [selectedChain, setSelectedChain] = useState<ChainId>(1);
  const [selectedToken0, setSelectedToken0] = useState<Token | null>(null);
  const [selectedToken1, setSelectedToken1] = useState<Token | null>(null);
  const [selectedFeeTier, setSelectedFeeTier] = useState<number>(3000); // 0.3%
  const [uniswapVersion, setUniswapVersion] = useState<UniswapVersion>('v3');
  const [token0Search, setToken0Search] = useState('');
  const [token1Search, setToken1Search] = useState('');  const [showToken0Results, setShowToken0Results] = useState(false);
  const [showToken1Results, setShowToken1Results] = useState(false);
  const [lowerPrice, setLowerPrice] = useState<string>('');
  const [upperPrice, setUpperPrice] = useState<string>('');
  const [isFullRange, setIsFullRange] = useState(false);
  const [depositMode, setDepositMode] = useState<'usd' | 'tokens'>('usd');
  const [depositUSD, setDepositUSD] = useState<number>(1000);  const [token0Amount, setToken0Amount] = useState<string>('');
  const [token1Amount, setToken1Amount] = useState<string>('');

  // Refs for click outside handling
  const token0DropdownRef = useRef<HTMLDivElement>(null);
  const token1DropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (token0DropdownRef.current && !token0DropdownRef.current.contains(event.target as Node)) {
        setShowToken0Results(false);
      }
      if (token1DropdownRef.current && !token1DropdownRef.current.contains(event.target as Node)) {
        setShowToken1Results(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const availableTokens = COMMON_TOKENS[selectedChain] || [];

  // Filter tokens based on search
  const filteredToken0Options = useMemo(() => {
    if (!token0Search) return availableTokens;
    return availableTokens.filter(token => 
      token.symbol.toLowerCase().includes(token0Search.toLowerCase()) ||
      token.name.toLowerCase().includes(token0Search.toLowerCase()) ||
      token.address.toLowerCase().includes(token0Search.toLowerCase())
    );
  }, [token0Search, availableTokens]);

  const filteredToken1Options = useMemo(() => {
    if (!token1Search) return availableTokens;
    return availableTokens.filter(token => 
      token.symbol.toLowerCase().includes(token1Search.toLowerCase()) ||
      token.name.toLowerCase().includes(token1Search.toLowerCase()) ||
      token.address.toLowerCase().includes(token1Search.toLowerCase())
    );
  }, [token1Search, availableTokens]);
  // Search for the specific pool based on token pair and fee tier
  const { data: poolData, isLoading: poolLoading, error: poolError } = useQuery({
    queryKey: ['pool-data', selectedToken0?.address, selectedToken1?.address, selectedFeeTier, selectedChain, uniswapVersion],
    queryFn: async () => {
      if (!selectedToken0 || !selectedToken1) return null;
      
      // For V4, we don't have subgraph data yet, so return mock data
      if (uniswapVersion === 'v4') {
        return {
          id: `${selectedToken0.address}-${selectedToken1.address}-${selectedFeeTier}`,
          token0: selectedToken0,
          token1: selectedToken1,
          fee: selectedFeeTier,
          version: uniswapVersion,
          sqrtPriceX96: '1000000000000000000000000',
          liquidity: '1000000000000000000',
          tick: 0,
          feeGrowthGlobal0X128: '0',
          feeGrowthGlobal1X128: '0',
          chainId: selectedChain,
          tvlUSD: 500000, // Mock data for V4
          volume24hUSD: 25000,
        };
      }
      
      // Use real subgraph data for V3
      const pool = await getPoolByTokens(
        selectedToken0.address,
        selectedToken1.address,
        selectedFeeTier,
        selectedChain
      );
      
      if (pool) {
        // Add additional fields that might be missing from subgraph
        return {
          ...pool,
          version: uniswapVersion,
          tvlUSD: parseFloat(pool.totalValueLockedUSD || '0'),
          volume24hUSD: parseFloat(pool.volumeUSD || '0'),
        };
      }
      
      return null;
    },
    enabled: !!selectedToken0 && !!selectedToken1,
    staleTime: 30 * 1000,
    retry: 2,
  });
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!poolData || !selectedToken0 || !selectedToken1) return;

    let finalTickLower: number;
    let finalTickUpper: number;

    if (isFullRange) {
      finalTickLower = -887220;
      finalTickUpper = 887220;
    } else {
      const lowerPriceNum = parseFloat(lowerPrice);
      const upperPriceNum = parseFloat(upperPrice);
      
      if (isNaN(lowerPriceNum) || isNaN(upperPriceNum)) {
        alert('Please enter valid price values');
        return;
      }

      const shouldInvert = shouldInvertDisplay(selectedToken0, selectedToken1);
      finalTickLower = readablePriceToTick(lowerPriceNum, selectedToken0, selectedToken1, shouldInvert);
      finalTickUpper = readablePriceToTick(upperPriceNum, selectedToken0, selectedToken1, shouldInvert);
    }

    const input: PositionInput = {
      chainId: selectedChain,
      poolAddress: poolData.id,
      tickLower: finalTickLower,
      tickUpper: finalTickUpper,
      isFullRange,
      ...(depositMode === 'usd' 
        ? { depositUSD } 
        : { token0Amount, token1Amount }
      )
    };

    onSubmit(input);
  };

  // Handle token selection
  const handleToken0Select = (token: Token) => {
    setSelectedToken0(token);
    setToken0Search(token.symbol);
    setShowToken0Results(false);
  };

  const handleToken1Select = (token: Token) => {
    setSelectedToken1(token);
    setToken1Search(token.symbol);
    setShowToken1Results(false);
  };

  // Fee tier options with descriptions
  const feeTierOptions = [
    { value: 500, label: '0.05%', description: 'Best for very stable pairs' },
    { value: 3000, label: '0.3%', description: 'Best for most pairs' },
    { value: 10000, label: '1%', description: 'Best for volatile pairs' },
  ];

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          Position Calculator
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Chain Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Network</label>
            <Select
              value={selectedChain.toString()}
              onChange={(e) => {
                setSelectedChain(Number(e.target.value) as ChainId);
                setSelectedToken0(null);
                setSelectedToken1(null);
                setToken0Search('');
                setToken1Search('');
              }}
            >
              {Object.values(CHAINS).map((chain) => (
                <option key={chain.id} value={chain.id}>
                  {chain.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Uniswap Version Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Uniswap Version</label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setUniswapVersion('v3')}
                className={cn(
                  "px-4 py-2 text-sm rounded-lg border transition-colors",
                  uniswapVersion === 'v3' 
                    ? "bg-primary text-primary-foreground border-primary" 
                    : "bg-secondary text-secondary-foreground border-border hover:bg-accent"
                )}
              >
                Uniswap V3
              </button>
              <button
                type="button"
                onClick={() => setUniswapVersion('v4')}
                className={cn(
                  "px-4 py-2 text-sm rounded-lg border transition-colors",
                  uniswapVersion === 'v4' 
                    ? "bg-primary text-primary-foreground border-primary" 
                    : "bg-secondary text-secondary-foreground border-border hover:bg-accent"
                )}
              >
                Uniswap V4 {uniswapVersion === 'v4' && <span className="ml-1 text-xs">(Beta)</span>}
              </button>
            </div>
          </div>

          {/* Token Pair Selection */}
          <div className="grid grid-cols-2 gap-4">            {/* Token 0 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Token A</label>
              <div className="relative" ref={token0DropdownRef}>
                <Input
                  placeholder="Search token..."
                  value={token0Search}
                  onChange={(e) => {
                    setToken0Search(e.target.value);
                    setShowToken0Results(true);
                  }}
                  onFocus={() => setShowToken0Results(true)}
                  className="pr-10"
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                
                {showToken0Results && filteredToken0Options.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 border border-border rounded-lg bg-card max-h-48 overflow-y-auto shadow-lg">
                    {filteredToken0Options.map((token) => (
                      <button
                        key={token.address}
                        type="button"
                        onClick={() => handleToken0Select(token)}
                        className="w-full p-3 text-left hover:bg-accent hover:text-accent-foreground border-b border-border last:border-b-0 transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">{token.symbol}</div>
                            <div className="text-sm text-muted-foreground truncate">{token.name}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>            {/* Token 1 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Token B</label>
              <div className="relative" ref={token1DropdownRef}>
                <Input
                  placeholder="Search token..."
                  value={token1Search}
                  onChange={(e) => {
                    setToken1Search(e.target.value);
                    setShowToken1Results(true);
                  }}
                  onFocus={() => setShowToken1Results(true)}
                  className="pr-10"
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                
                {showToken1Results && filteredToken1Options.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 border border-border rounded-lg bg-card max-h-48 overflow-y-auto shadow-lg">
                    {filteredToken1Options.map((token) => (
                      <button
                        key={token.address}
                        type="button"
                        onClick={() => handleToken1Select(token)}
                        className="w-full p-3 text-left hover:bg-accent hover:text-accent-foreground border-b border-border last:border-b-0 transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">{token.symbol}</div>
                            <div className="text-sm text-muted-foreground truncate">{token.name}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Fee Tier Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Fee Tier</label>
            <div className="grid grid-cols-3 gap-2">
              {feeTierOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedFeeTier(option.value)}
                  className={cn(
                    "p-3 text-center border rounded-lg transition-colors",
                    selectedFeeTier === option.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary text-secondary-foreground border-border hover:bg-accent"
                  )}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{option.description}</div>
                </button>
              ))}
            </div>
          </div>          {/* Selected Pool Info */}
          {selectedToken0 && selectedToken1 && (
            <div className="p-4 bg-secondary rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <div className="font-medium text-lg">
                    {selectedToken0.symbol}/{selectedToken1.symbol}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Fee: {(selectedFeeTier / 10000).toFixed(2)}% • {uniswapVersion.toUpperCase()}
                  </div>
                </div>
                {poolData && (
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      TVL: ${(() => {
                        const poolDataAny = poolData as any;
                        if (poolDataAny.tvlUSD) return poolDataAny.tvlUSD.toLocaleString();
                        if (poolDataAny.totalValueLockedUSD) return parseFloat(poolDataAny.totalValueLockedUSD).toLocaleString();
                        return 'N/A';
                      })()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      24h Volume: ${(() => {
                        const poolDataAny = poolData as any;
                        if (poolDataAny.volume24hUSD) return poolDataAny.volume24hUSD.toLocaleString();
                        if (poolDataAny.volumeUSD) return parseFloat(poolDataAny.volumeUSD).toLocaleString();
                        return 'N/A';
                      })()}
                    </div>
                  </div>
                )}
              </div>
              
              {poolLoading && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span>Loading pool data...</span>
                </div>
              )}
              
              {poolError && (
                <div className="flex items-center space-x-2 text-sm text-destructive">
                  <Info className="w-4 h-4" />
                  <span>Failed to load pool data</span>
                </div>
              )}
              
              {!poolLoading && !poolData && !poolError && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Info className="w-4 h-4" />
                  <span>Pool not found for this token pair and fee tier</span>
                </div>
              )}
              
              {poolData && uniswapVersion === 'v4' && (
                <div className="mt-2 text-xs text-muted-foreground bg-accent p-2 rounded">
                  ⚠️ Uniswap V4 is in beta. Pool data is estimated and may not reflect actual on-chain state.
                </div>
              )}
            </div>
          )}          {/* Price Range */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Price Range</label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="full-range"
                  checked={isFullRange}
                  onChange={(e) => {
                    setIsFullRange(e.target.checked);
                    if (e.target.checked) {
                      setLowerPrice('');
                      setUpperPrice('');
                    }
                  }}
                  className="rounded border-border"
                />
                <label htmlFor="full-range" className="text-sm">Full Range</label>
              </div>
            </div>

            {poolData && selectedToken0 && selectedToken1 && (
              <div className="p-3 bg-accent rounded-lg">
                <div className="text-sm font-medium mb-2">Current Pool Price</div>
                <div className="text-lg">
                  {(() => {
                    const shouldInvert = shouldInvertDisplay(selectedToken0, selectedToken1);
                    const currentPrice = getCurrentPoolPrice(poolData, shouldInvert);
                    const baseToken = shouldInvert ? selectedToken1 : selectedToken0;
                    const quoteToken = shouldInvert ? selectedToken0 : selectedToken1;
                    return `${formatPrice(currentPrice)} ${quoteToken.symbol} per ${baseToken.symbol}`;
                  })()}
                </div>
              </div>
            )}
            
            {!isFullRange && selectedToken0 && selectedToken1 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Lower Price</label>
                    <Input
                      type="number"
                      value={lowerPrice}
                      onChange={(e) => setLowerPrice(e.target.value)}
                      placeholder="0.0"
                      step="any"
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Upper Price</label>
                    <Input
                      type="number"
                      value={upperPrice}
                      onChange={(e) => setUpperPrice(e.target.value)}
                      placeholder="0.0"
                      step="any"
                      min="0"
                    />
                  </div>
                </div>

                {/* Price Range Suggestions */}
                {poolData && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Quick Range Presets</div>
                    <div className="grid grid-cols-3 gap-2">
                      {(() => {
                        const shouldInvert = shouldInvertDisplay(selectedToken0, selectedToken1);
                        const currentPrice = getCurrentPoolPrice(poolData, shouldInvert);
                        const suggestions = getPriceRangeSuggestions(currentPrice, selectedToken0, selectedToken1);
                        
                        return [
                          { label: 'Tight (±5%)', range: suggestions.tight },
                          { label: 'Normal (±20%)', range: suggestions.normal },
                          { label: 'Wide (±100%)', range: suggestions.wide },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              setLowerPrice(preset.range[0].toString());
                              setUpperPrice(preset.range[1].toString());
                            }}
                            className="p-2 text-xs border rounded hover:bg-accent transition-colors"
                          >
                            <div className="font-medium">{preset.label}</div>
                            <div className="text-muted-foreground">
                              {formatPrice(preset.range[0])} - {formatPrice(preset.range[1])}
                            </div>
                          </button>
                        ));
                      })()}
                    </div>
                  </div>
                )}

                {/* Price Range Validation */}
                {lowerPrice && upperPrice && poolData && (
                  <div className="text-sm">
                    {(() => {
                      const lowerPriceNum = parseFloat(lowerPrice);
                      const upperPriceNum = parseFloat(upperPrice);
                      const shouldInvert = shouldInvertDisplay(selectedToken0, selectedToken1);
                      const currentPrice = getCurrentPoolPrice(poolData, shouldInvert);
                      
                      if (!isNaN(lowerPriceNum) && !isNaN(upperPriceNum)) {
                        const validation = validatePriceRange(lowerPriceNum, upperPriceNum, currentPrice);
                        
                        if (!validation.isValid) {
                          return (
                            <div className="flex items-center space-x-2 text-destructive">
                              <Info className="w-4 h-4" />
                              <span>{validation.error}</span>
                            </div>
                          );
                        } else {
                          return (
                            <div className="text-muted-foreground">
                              ✓ Price range looks good. Current price is within your range.
                            </div>
                          );
                        }
                      }
                      return null;
                    })()}
                  </div>
                )}
              </>
            )}

            {!selectedToken0 || !selectedToken1 ? (
              <div className="text-sm text-muted-foreground">
                Select both tokens to configure price range
              </div>
            ) : null}
          </div>

          {/* Deposit Amount */}
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium">Deposit:</span>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setDepositMode('usd')}
                  className={cn(
                    "px-3 py-1 text-sm rounded",
                    depositMode === 'usd' 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-secondary text-secondary-foreground"
                  )}
                >
                  USD Amount
                </button>
                <button
                  type="button"
                  onClick={() => setDepositMode('tokens')}
                  className={cn(
                    "px-3 py-1 text-sm rounded",
                    depositMode === 'tokens' 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-secondary text-secondary-foreground"
                  )}
                >
                  Token Amounts
                </button>
              </div>
            </div>

            {depositMode === 'usd' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">USD Amount</label>
                <Input
                  type="number"
                  value={depositUSD}
                  onChange={(e) => setDepositUSD(Number(e.target.value))}
                  placeholder="1000"
                  min="0"
                  step="100"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {selectedToken0?.symbol || 'Token A'} Amount
                  </label>
                  <Input
                    type="number"
                    value={token0Amount}
                    onChange={(e) => setToken0Amount(e.target.value)}
                    placeholder="0.0"
                    min="0"
                    step="any"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {selectedToken1?.symbol || 'Token B'} Amount
                  </label>
                  <Input
                    type="number"
                    value={token1Amount}
                    onChange={(e) => setToken1Amount(e.target.value)}
                    placeholder="0.0"
                    min="0"
                    step="any"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={!selectedToken0 || !selectedToken1 || loading || poolLoading}
            size="lg"
          >
            {loading || poolLoading ? 'Loading...' : 'Calculate APR & Fees'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
