export type ChainId = 1 | 42161 | 10 | 8453; // Ethereum, Arbitrum One, Optimism, Base

export interface Chain {
  id: ChainId;
  name: string;
  rpcUrl: string;
  subgraphUrl: string;
  nativeCurrency: string;
  blockExplorer: string;
}

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: ChainId;
}

export interface Pool {
  id: string;
  token0: Token;
  token1: Token;
  fee: number;
  sqrtPriceX96: string;
  liquidity: string;
  tick: number;
  feeGrowthGlobal0X128: string;
  feeGrowthGlobal1X128: string;
  chainId: ChainId;
  // Optional fields from subgraph
  totalValueLockedUSD?: string;
  volumeUSD?: string;
  feesUSD?: string;
}

export interface Position {
  id: string;
  pool: Pool;
  tickLower: number;
  tickUpper: number;
  liquidity: string;
  feeGrowthInside0LastX128: string;
  feeGrowthInside1LastX128: string;
  tokensOwed0: string;
  tokensOwed1: string;
}

export interface TickData {
  id: string;
  tickIdx: number;
  liquidityGross: string;
  liquidityNet: string;
  feeGrowthOutside0X128: string;
  feeGrowthOutside1X128: string;
}

export interface FeeData {
  feeGrowthInside0X128: string;
  feeGrowthInside1X128: string;
  fees0USD: number;
  fees1USD: number;
  totalFeesUSD: number;
}

export interface APRData {
  apr24h: number;
  apr7d: number;
  apr30d: number;
  apy24h: number;
  apy7d: number;
  apy30d: number;
  monthlyRevenueUSD: number;
  yearlyRevenueUSD: number;
}

export interface PositionInput {
  chainId: ChainId;
  poolAddress: string;
  tickLower: number;
  tickUpper: number;
  depositUSD?: number;
  token0Amount?: string;
  token1Amount?: string;
  isFullRange: boolean;
}

export interface V4PoolKey {
  currency0: string;
  currency1: string;
  fee: number;
  tickSpacing: number;
  hooks: string;
}

export interface V4Pool {
  poolId: string;
  poolKey: V4PoolKey;
  sqrtPriceX96: string;
  liquidity: string;
  tick: number;
}

export interface CachedAPRData extends APRData {
  timestamp: number;
  poolId: string;
  tickLower: number;
  tickUpper: number;
}
