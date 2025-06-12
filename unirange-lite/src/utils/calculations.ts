import { Q96, Q128 } from '@/lib/constants';

/**
 * Calculate sqrt price from tick (simplified version)
 */
export function tickToSqrtPriceX96(tick: number): bigint {
  const price = Math.pow(1.0001, tick);
  const sqrtPrice = Math.sqrt(price);
  return BigInt(Math.floor(sqrtPrice * Number(Q96)));
}

/**
 * Calculate price from sqrt price
 */
export function sqrtPriceX96ToPrice(sqrtPriceX96: bigint, decimals0: number, decimals1: number): number {
  const sqrtPriceNum = Number(sqrtPriceX96) / Number(Q96);
  const price = sqrtPriceNum * sqrtPriceNum;
  return price * Math.pow(10, decimals0 - decimals1);
}

/**
 * Calculate fee growth inside a tick range
 */
export function getFeeGrowthInside(
  tickLower: number,
  tickUpper: number,
  currentTick: number,
  feeGrowthGlobal0X128: bigint,
  feeGrowthGlobal1X128: bigint,
  tickLowerFeeGrowthOutside0X128: bigint,
  tickLowerFeeGrowthOutside1X128: bigint,
  tickUpperFeeGrowthOutside0X128: bigint,
  tickUpperFeeGrowthOutside1X128: bigint
): { feeGrowthInside0X128: bigint; feeGrowthInside1X128: bigint } {
  let feeGrowthBelow0X128: bigint;
  let feeGrowthBelow1X128: bigint;
  let feeGrowthAbove0X128: bigint;
  let feeGrowthAbove1X128: bigint;

  // Calculate fee growth below
  if (currentTick >= tickLower) {
    feeGrowthBelow0X128 = tickLowerFeeGrowthOutside0X128;
    feeGrowthBelow1X128 = tickLowerFeeGrowthOutside1X128;
  } else {
    feeGrowthBelow0X128 = feeGrowthGlobal0X128 - tickLowerFeeGrowthOutside0X128;
    feeGrowthBelow1X128 = feeGrowthGlobal1X128 - tickLowerFeeGrowthOutside1X128;
  }

  // Calculate fee growth above
  if (currentTick < tickUpper) {
    feeGrowthAbove0X128 = tickUpperFeeGrowthOutside0X128;
    feeGrowthAbove1X128 = tickUpperFeeGrowthOutside1X128;
  } else {
    feeGrowthAbove0X128 = feeGrowthGlobal0X128 - tickUpperFeeGrowthOutside0X128;
    feeGrowthAbove1X128 = feeGrowthGlobal1X128 - tickUpperFeeGrowthOutside1X128;
  }

  const feeGrowthInside0X128 = feeGrowthGlobal0X128 - feeGrowthBelow0X128 - feeGrowthAbove0X128;
  const feeGrowthInside1X128 = feeGrowthGlobal1X128 - feeGrowthBelow1X128 - feeGrowthAbove1X128;

  return { feeGrowthInside0X128, feeGrowthInside1X128 };
}

/**
 * Calculate fees earned by a position
 */
export function calculatePositionFees(
  liquidity: bigint,
  feeGrowthInside0X128: bigint,
  feeGrowthInside1X128: bigint,
  feeGrowthInside0LastX128: bigint,
  feeGrowthInside1LastX128: bigint
): { fees0: bigint; fees1: bigint } {
  const fees0 = (liquidity * (feeGrowthInside0X128 - feeGrowthInside0LastX128)) / Q128;
  const fees1 = (liquidity * (feeGrowthInside1X128 - feeGrowthInside1LastX128)) / Q128;

  return { fees0, fees1 };
}

/**
 * Calculate liquidity for a position given amounts
 */
export function getLiquidityForAmounts(
  sqrtRatioX96: bigint,
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint,
  amount0: bigint,
  amount1: bigint
): bigint {
  if (sqrtRatioAX96 > sqrtRatioBX96) {
    [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
  }

  if (sqrtRatioX96 <= sqrtRatioAX96) {
    return getLiquidityForAmount0(sqrtRatioAX96, sqrtRatioBX96, amount0);
  } else if (sqrtRatioX96 < sqrtRatioBX96) {
    const liquidity0 = getLiquidityForAmount0(sqrtRatioX96, sqrtRatioBX96, amount0);
    const liquidity1 = getLiquidityForAmount1(sqrtRatioAX96, sqrtRatioX96, amount1);
    return liquidity0 < liquidity1 ? liquidity0 : liquidity1;
  } else {
    return getLiquidityForAmount1(sqrtRatioAX96, sqrtRatioBX96, amount1);
  }
}

function getLiquidityForAmount0(sqrtRatioAX96: bigint, sqrtRatioBX96: bigint, amount0: bigint): bigint {
  if (sqrtRatioAX96 > sqrtRatioBX96) {
    [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
  }
  const intermediate = (sqrtRatioAX96 * sqrtRatioBX96) / Q96;
  return (amount0 * intermediate) / (sqrtRatioBX96 - sqrtRatioAX96);
}

function getLiquidityForAmount1(sqrtRatioAX96: bigint, sqrtRatioBX96: bigint, amount1: bigint): bigint {
  if (sqrtRatioAX96 > sqrtRatioBX96) {
    [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
  }
  return (amount1 * Q96) / (sqrtRatioBX96 - sqrtRatioAX96);
}

/**
 * Calculate APR from fee data
 */
export function calculateAPR(
  feesUSD: number,
  positionValueUSD: number,
  timeframeHours: number
): number {
  if (positionValueUSD === 0 || timeframeHours === 0) return 0;
  const hoursInYear = 365 * 24;
  return (feesUSD / positionValueUSD) * (hoursInYear / timeframeHours);
}

/**
 * Calculate APY from APR (compounded daily)
 */
export function calculateAPY(apr: number): number {
  return Math.pow(1 + apr / 365, 365) - 1;
}

/**
 * Format large numbers with appropriate suffixes
 */
export function formatNumber(value: number, decimals = 2): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(decimals)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(decimals)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(decimals)}K`;
  return value.toFixed(decimals);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}