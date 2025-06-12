import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  PositionInput, 
  APRData, 
  Pool, 
  TickData, 
  FeeData,
  ChainId 
} from '@/types';
import { 
  getPoolByAddress, 
  getPoolHistoricalData,
  checkSubgraphHealth 
} from '@/lib/subgraph';
import { 
  getPoolData, 
  getTickData, 
  getETHPriceUSD 
} from '@/lib/blockchain';
import { APRCache } from '@/lib/cache';
import { 
  getFeeGrowthInside,
  calculatePositionFees,
  getLiquidityForAmounts,
  tickToSqrtPriceX96,
  sqrtPriceX96ToPrice,
  calculateAPR,
  calculateAPY 
} from '@/utils/calculations';

interface UseAPRCalculationResult {
  data: APRData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  subgraphLag: number;
  usingFallback: boolean;
}

export function useAPRCalculation(input: PositionInput | null): UseAPRCalculationResult {
  const [subgraphLag, setSubgraphLag] = useState(0);
  const [usingFallback, setUsingFallback] = useState(false);

  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['apr-calculation', input],
    queryFn: () => calculateAPRData(input!),
    enabled: !!input?.poolAddress && !!input?.chainId,
    staleTime: 30 * 1000, // 30 seconds
    retry: 3,
  });

  useEffect(() => {
    // Check subgraph health on mount and when chain changes
    if (input?.chainId) {
      checkSubgraphHealth(input.chainId).then(health => {
        setSubgraphLag(health.lagSeconds);
        setUsingFallback(!health.isHealthy);
      });
    }
  }, [input?.chainId]);

  return {
    data: data || null,
    loading: isLoading,
    error: error?.message || null,
    refetch,
    subgraphLag,
    usingFallback,
  };
}

async function calculateAPRData(input: PositionInput): Promise<APRData> {
  // Check cache first
  const cachedData = await APRCache.getAPR(
    input.poolAddress,
    input.tickLower,
    input.tickUpper,
    input.chainId
  );

  if (cachedData && Date.now() - cachedData.timestamp < 5 * 60 * 1000) {
    return cachedData;
  }

  // Get pool data and calculate fees
  const feeData24h = await calculateFeeData(input, 24);
  const feeData7d = await calculateFeeData(input, 7 * 24);
  const feeData30d = await calculateFeeData(input, 30 * 24);

  // Calculate position value in USD
  const positionValueUSD = await calculatePositionValueUSD(input);

  // Calculate APRs
  const apr24h = calculateAPR(feeData24h.totalFeesUSD, positionValueUSD, 24);
  const apr7d = calculateAPR(feeData7d.totalFeesUSD, positionValueUSD, 7 * 24);
  const apr30d = calculateAPR(feeData30d.totalFeesUSD, positionValueUSD, 30 * 24);

  // Calculate APYs (compounded daily)
  const apy24h = calculateAPY(apr24h);
  const apy7d = calculateAPY(apr7d);
  const apy30d = calculateAPY(apr30d);

  // Calculate projected revenues
  const monthlyRevenueUSD = (feeData30d.totalFeesUSD / 30) * 30;
  const yearlyRevenueUSD = (feeData30d.totalFeesUSD / 30) * 365;

  const result: APRData = {
    apr24h,
    apr7d,
    apr30d,
    apy24h,
    apy7d,
    apy30d,
    monthlyRevenueUSD,
    yearlyRevenueUSD,
  };

  // Cache the result
  await APRCache.setAPR(
    input.poolAddress,
    input.tickLower,
    input.tickUpper,
    input.chainId,
    result
  );

  return result;
}

async function calculateFeeData(input: PositionInput, hoursBack: number): Promise<FeeData> {
  try {
    // Try subgraph first
    const { current, historical, subgraphLag } = await getPoolHistoricalData(
      input.poolAddress,
      input.chainId,
      hoursBack
    );

    if (current && historical && subgraphLag < 30 * 60) {
      return calculateFeeDataFromSubgraph(input, current, historical);
    }

    // Fallback to RPC
    console.warn('Using RPC fallback for fee calculation');
    return calculateFeeDataFromRPC(input, hoursBack);
  } catch (error) {
    console.error('Error calculating fee data:', error);
    return {
      feeGrowthInside0X128: '0',
      feeGrowthInside1X128: '0',
      fees0USD: 0,
      fees1USD: 0,
      totalFeesUSD: 0,
    };
  }
}

async function calculateFeeDataFromSubgraph(
  input: PositionInput,
  current: Pool,
  historical: Pool
): Promise<FeeData> {
  // Get tick data for the position range
  const [tickLowerData, tickUpperData] = await Promise.all([
    getTickDataFromSubgraph(input.poolAddress, input.tickLower, input.chainId),
    getTickDataFromSubgraph(input.poolAddress, input.tickUpper, input.chainId),
  ]);

  // Calculate fee growth inside for current and historical states
  const currentFeeGrowth = getFeeGrowthInside(
    input.tickLower,
    input.tickUpper,
    current.tick,
    BigInt(current.feeGrowthGlobal0X128),
    BigInt(current.feeGrowthGlobal1X128),
    BigInt(tickLowerData?.feeGrowthOutside0X128 || '0'),
    BigInt(tickLowerData?.feeGrowthOutside1X128 || '0'),
    BigInt(tickUpperData?.feeGrowthOutside0X128 || '0'),
    BigInt(tickUpperData?.feeGrowthOutside1X128 || '0')
  );

  const historicalFeeGrowth = getFeeGrowthInside(
    input.tickLower,
    input.tickUpper,
    historical.tick,
    BigInt(historical.feeGrowthGlobal0X128),
    BigInt(historical.feeGrowthGlobal1X128),
    BigInt(tickLowerData?.feeGrowthOutside0X128 || '0'),
    BigInt(tickLowerData?.feeGrowthOutside1X128 || '0'),
    BigInt(tickUpperData?.feeGrowthOutside0X128 || '0'),
    BigInt(tickUpperData?.feeGrowthOutside1X128 || '0')
  );

  // Calculate liquidity for position
  const sqrtPriceX96 = BigInt(current.sqrtPriceX96);
  const sqrtPriceAX96 = tickToSqrtPriceX96(input.tickLower);
  const sqrtPriceBX96 = tickToSqrtPriceX96(input.tickUpper);

  let liquidity: bigint;
  if (input.depositUSD) {
    // Calculate liquidity from USD deposit
    const ethPrice = await getETHPriceUSD();
    const token0Price = sqrtPriceX96ToPrice(sqrtPriceX96, current.token0.decimals, current.token1.decimals);
    
    // Simplified: assume equal token amounts
    const halfUSD = input.depositUSD / 2;
    const amount0 = BigInt(Math.floor((halfUSD / ethPrice) * 10 ** current.token0.decimals));
    const amount1 = BigInt(Math.floor((halfUSD / token0Price / ethPrice) * 10 ** current.token1.decimals));
    
    liquidity = getLiquidityForAmounts(sqrtPriceX96, sqrtPriceAX96, sqrtPriceBX96, amount0, amount1);
  } else {
    // Use provided token amounts
    const amount0 = BigInt(input.token0Amount || '0');
    const amount1 = BigInt(input.token1Amount || '0');
    liquidity = getLiquidityForAmounts(sqrtPriceX96, sqrtPriceAX96, sqrtPriceBX96, amount0, amount1);
  }

  // Calculate fees earned
  const fees = calculatePositionFees(
    liquidity,
    currentFeeGrowth.feeGrowthInside0X128,
    currentFeeGrowth.feeGrowthInside1X128,
    historicalFeeGrowth.feeGrowthInside0X128,
    historicalFeeGrowth.feeGrowthInside1X128
  );

  // Convert to USD
  const ethPrice = await getETHPriceUSD();
  const token0Price = sqrtPriceX96ToPrice(sqrtPriceX96, current.token0.decimals, current.token1.decimals);
  
  const fees0USD = Number(fees.fees0) / 10 ** current.token0.decimals * ethPrice;
  const fees1USD = Number(fees.fees1) / 10 ** current.token1.decimals * token0Price * ethPrice;

  return {
    feeGrowthInside0X128: currentFeeGrowth.feeGrowthInside0X128.toString(),
    feeGrowthInside1X128: currentFeeGrowth.feeGrowthInside1X128.toString(),
    fees0USD,
    fees1USD,
    totalFeesUSD: fees0USD + fees1USD,
  };
}

async function calculateFeeDataFromRPC(input: PositionInput, hoursBack: number): Promise<FeeData> {
  // This would implement RPC-based fee calculation
  // For now, return mock data
  console.warn('RPC fee calculation not fully implemented');
  
  return {
    feeGrowthInside0X128: '0',
    feeGrowthInside1X128: '0',
    fees0USD: 0,
    fees1USD: 0,
    totalFeesUSD: 0,
  };
}

async function getTickDataFromSubgraph(
  poolAddress: string,
  tick: number,
  chainId: ChainId
): Promise<TickData | null> {
  // This would query subgraph for tick data
  // For now, fallback to RPC
  return getTickData(poolAddress, tick, chainId);
}

async function calculatePositionValueUSD(input: PositionInput): Promise<number> {
  if (input.depositUSD) {
    return input.depositUSD;
  }

  // Calculate from token amounts
  const pool = await getPoolByAddress(input.poolAddress, input.chainId);
  if (!pool) return 0;

  const ethPrice = await getETHPriceUSD();
  const sqrtPriceX96 = BigInt(pool.sqrtPriceX96);
  const token0Price = sqrtPriceX96ToPrice(sqrtPriceX96, pool.token0.decimals, pool.token1.decimals);

  const amount0USD = (Number(input.token0Amount || '0') / 10 ** pool.token0.decimals) * ethPrice;
  const amount1USD = (Number(input.token1Amount || '0') / 10 ** pool.token1.decimals) * token0Price * ethPrice;

  return amount0USD + amount1USD;
}
