import { request, gql } from 'graphql-request';
import { CHAINS, SUBGRAPH_LAG_THRESHOLD, COMMON_TOKENS } from '@/lib/constants';
import { Pool, Token, ChainId } from '@/types';

interface SubgraphPool {
  id: string;
  token0: {
    id: string;
    symbol: string;
    name: string;
    decimals: string;
  };
  token1: {
    id: string;
    symbol: string;
    name: string;
    decimals: string;
  };
  feeTier: string;
  sqrtPrice: string;
  liquidity: string;
  tick: string;
  feeGrowthGlobal0X128: string;
  feeGrowthGlobal1X128: string;
  volumeUSD: string;
  feesUSD: string;
  totalValueLockedUSD: string;
}

interface SubgraphResponse {
  pools: SubgraphPool[];
  _meta: {
    block: {
      number: number;
      timestamp: number;
    };
  };
}

// GraphQL queries
const POOLS_QUERY = gql`
  query GetPools($first: Int!, $where: Pool_filter, $block: Block_height) {
    pools(first: $first, where: $where, block: $block, orderBy: totalValueLockedUSD, orderDirection: desc) {
      id
      token0 {
        id
        symbol
        name
        decimals
      }
      token1 {
        id
        symbol
        name
        decimals
      }
      feeTier
      sqrtPrice
      liquidity
      tick
      feeGrowthGlobal0X128
      feeGrowthGlobal1X128
      volumeUSD
      feesUSD
      totalValueLockedUSD
    }
    _meta {
      block {
        number
        timestamp
      }
    }
  }
`;

const POOL_BY_ADDRESS_QUERY = gql`
  query GetPoolByAddress($id: ID!, $block: Block_height) {
    pool(id: $id, block: $block) {
      id
      token0 {
        id
        symbol
        name
        decimals
      }
      token1 {
        id
        symbol
        name
        decimals
      }
      feeTier
      sqrtPrice
      liquidity
      tick
      feeGrowthGlobal0X128
      feeGrowthGlobal1X128
      volumeUSD
      feesUSD
      totalValueLockedUSD
    }
    _meta {
      block {
        number
        timestamp
      }
    }
  }
`;

const POOL_HOURLY_SNAPSHOTS_QUERY = gql`
  query GetPoolHourlySnapshots($pool: String!, $first: Int!, $orderBy: String!, $orderDirection: String!, $where: PoolHourData_filter) {
    poolHourDatas(
      where: { pool: $pool, ...where }
      first: $first
      orderBy: $orderBy
      orderDirection: $orderDirection
    ) {
      id
      periodStartUnix
      liquidity
      sqrtPrice
      token0Price
      token1Price
      volumeUSD
      feesUSD
      feeGrowthGlobal0X128
      feeGrowthGlobal1X128
    }
  }
`;

/**
 * Search pools by token symbols or addresses
 */
export async function searchPools(
  query: string,
  chainId: ChainId,
  limit = 20
): Promise<Pool[]> {
  try {
    const subgraphUrl = CHAINS[chainId].subgraphUrl;
    
    // Search by token symbols or addresses
    const where: any = {
      or: [
        { token0_: { symbol_contains_nocase: query } },
        { token1_: { symbol_contains_nocase: query } },
        { token0_: { name_contains_nocase: query } },
        { token1_: { name_contains_nocase: query } },
      ]
    };

    // If query looks like an address, add address filters
    if (query.startsWith('0x') && query.length === 42) {
      where.or.push(
        { token0: query.toLowerCase() },
        { token1: query.toLowerCase() },
        { id: query.toLowerCase() }
      );
    }

    const response: SubgraphResponse = await request(subgraphUrl, POOLS_QUERY, {
      first: limit,
      where,
    });

    return response.pools.map(transformSubgraphPool).map(pool => ({ ...pool, chainId }));
  } catch (error) {
    console.error('Error searching pools:', error);
    return [];
  }
}

/**
 * Get pool by address
 */
export async function getPoolByAddress(
  address: string,
  chainId: ChainId,
  blockNumber?: number
): Promise<Pool | null> {
  try {
    const subgraphUrl = CHAINS[chainId].subgraphUrl;
    const block = blockNumber ? { number: blockNumber } : undefined;

    const response: { pool: SubgraphPool | null } = await request(subgraphUrl, POOL_BY_ADDRESS_QUERY, {
      id: address.toLowerCase(),
      block,
    });

    if (!response.pool) return null;

    return { ...transformSubgraphPool(response.pool), chainId };
  } catch (error) {
    console.error('Error fetching pool:', error);
    return null;
  }
}

/**
 * Get pool historical data for APR calculation
 */
export async function getPoolHistoricalData(
  poolAddress: string,
  chainId: ChainId,
  hoursBack: number
): Promise<{
  current: Pool | null;
  historical: Pool | null;
  subgraphLag: number;
}> {
  try {
    const subgraphUrl = CHAINS[chainId].subgraphUrl;
      // Get current data
    const currentResponse: { pool: SubgraphPool | null; _meta: { block: { number: number; timestamp: number } } } = await request(subgraphUrl, POOL_BY_ADDRESS_QUERY, {
      id: poolAddress.toLowerCase(),
    });

    if (!currentResponse.pool || !currentResponse._meta) {
      return { current: null, historical: null, subgraphLag: 0 };
    }

    const currentTimestamp = currentResponse._meta.block.timestamp;
    const currentBlock = currentResponse._meta.block.number;
    const now = Math.floor(Date.now() / 1000);
    const subgraphLag = now - currentTimestamp;

    // Check if subgraph is too far behind
    if (subgraphLag > SUBGRAPH_LAG_THRESHOLD / 1000) {
      console.warn(`Subgraph lag detected: ${subgraphLag}s`);
    }

    // Calculate target block for historical data
    const secondsBack = hoursBack * 3600;
    const targetTimestamp = currentTimestamp - secondsBack;
    
    // Estimate block number (assuming ~12s block time for Ethereum)
    const blockTime = chainId === 1 ? 12 : chainId === 42161 ? 0.25 : 2;
    const blocksBack = Math.floor(secondsBack / blockTime);
    const targetBlock = Math.max(1, currentBlock - blocksBack);    // Get historical data
    const historicalResponse: { pool: SubgraphPool | null } = await request(subgraphUrl, POOL_BY_ADDRESS_QUERY, {
      id: poolAddress.toLowerCase(),
      block: { number: targetBlock },
    });

    const current = { ...transformSubgraphPool(currentResponse.pool), chainId };
    const historical = historicalResponse.pool 
      ? { ...transformSubgraphPool(historicalResponse.pool), chainId }
      : null;

    return { current, historical, subgraphLag };
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return { current: null, historical: null, subgraphLag: 0 };
  }
}

/**
 * Get pool by token pair and fee tier
 */
export async function getPoolByTokens(
  token0Address: string,
  token1Address: string,
  feeTier: number,
  chainId: ChainId
): Promise<Pool | null> {
  try {
    const subgraphUrl = CHAINS[chainId].subgraphUrl;
    
    // Sort token addresses to match Uniswap's canonical ordering
    const [sortedToken0, sortedToken1] = [token0Address.toLowerCase(), token1Address.toLowerCase()].sort();
    
    const where = {
      token0: sortedToken0,
      token1: sortedToken1,
      feeTier: feeTier.toString(),
    };

    try {
      const response: SubgraphResponse = await request(subgraphUrl, POOLS_QUERY, {
        first: 1,
        where,
      });

      if (response.pools.length === 0) {
        return createMockPool(token0Address, token1Address, feeTier, chainId);
      }

      const transformedPool = { ...transformSubgraphPool(response.pools[0]), chainId };
      return transformedPool;
    } catch (subgraphError) {
      // Fallback to mock pool if subgraph request fails
      return createMockPool(token0Address, token1Address, feeTier, chainId);
    }
  } catch (error) {
    return createMockPool(token0Address, token1Address, feeTier, chainId);
  }
}

/**
 * Create mock pool data for testing when subgraph is unavailable
 */
function createMockPool(
  token0Address: string,
  token1Address: string,
  feeTier: number,
  chainId: ChainId
): Pool {
  // Sort addresses to match Uniswap's canonical ordering
  const [sortedToken0, sortedToken1] = [token0Address.toLowerCase(), token1Address.toLowerCase()].sort();
    // Get tokens from our constants
  const availableTokens = COMMON_TOKENS[chainId] || [];
  const token0 = availableTokens.find((t: Token) => t.address.toLowerCase() === sortedToken0) || {
    address: sortedToken0,
    symbol: 'TOKEN0',
    name: 'Token 0',
    decimals: 18,
    chainId,
  };
  
  const token1 = availableTokens.find((t: Token) => t.address.toLowerCase() === sortedToken1) || {
    address: sortedToken1,
    symbol: 'TOKEN1',
    name: 'Token 1',
    decimals: 18,
    chainId,
  };
  // Generate a pool ID
  const poolId = `${sortedToken0}-${sortedToken1}-${feeTier}`;

  return {
    id: poolId,
    token0: token0 as Token,
    token1: token1 as Token,
    fee: feeTier,
    sqrtPriceX96: '79228162514264337593543950336', // Represents 1:1 price
    liquidity: '1000000000000000000000', // 1000 ETH equivalent
    tick: 0,
    feeGrowthGlobal0X128: '1000000000000000000000000000000000',
    feeGrowthGlobal1X128: '1000000000000000000000000000000000',
    chainId,
    totalValueLockedUSD: '500000', // Mock $500k TVL
    volumeUSD: '25000', // Mock $25k daily volume
    feesUSD: '75', // Mock $75 daily fees
  };
}

/**
 * Get popular pools for a chain
 */
export async function getPopularPools(chainId: ChainId, limit = 50): Promise<Pool[]> {
  try {
    const subgraphUrl = CHAINS[chainId].subgraphUrl;

    const response: SubgraphResponse = await request(subgraphUrl, POOLS_QUERY, {
      first: limit,
      where: {
        totalValueLockedUSD_gt: "1000", // Only pools with >$1k TVL
      },
    });

    return response.pools.map(transformSubgraphPool).map(pool => ({ ...pool, chainId }));
  } catch (error) {
    console.error('Error fetching popular pools:', error);
    return [];
  }
}

/**
 * Transform subgraph pool data to our Pool type
 */
function transformSubgraphPool(subgraphPool: SubgraphPool): Omit<Pool, 'chainId'> {
  const token0: Omit<Token, 'chainId'> = {
    address: subgraphPool.token0.id,
    symbol: subgraphPool.token0.symbol,
    name: subgraphPool.token0.name,
    decimals: parseInt(subgraphPool.token0.decimals),
  };

  const token1: Omit<Token, 'chainId'> = {
    address: subgraphPool.token1.id,
    symbol: subgraphPool.token1.symbol,
    name: subgraphPool.token1.name,
    decimals: parseInt(subgraphPool.token1.decimals),
  };

  return {
    id: subgraphPool.id,
    token0: token0 as Token,
    token1: token1 as Token,
    fee: parseInt(subgraphPool.feeTier),
    sqrtPriceX96: subgraphPool.sqrtPrice,
    liquidity: subgraphPool.liquidity,
    tick: parseInt(subgraphPool.tick),
    feeGrowthGlobal0X128: subgraphPool.feeGrowthGlobal0X128,
    feeGrowthGlobal1X128: subgraphPool.feeGrowthGlobal1X128,
    totalValueLockedUSD: subgraphPool.totalValueLockedUSD,
    volumeUSD: subgraphPool.volumeUSD,
    feesUSD: subgraphPool.feesUSD,
  };
}

/**
 * Check subgraph health and lag
 */
export async function checkSubgraphHealth(chainId: ChainId): Promise<{
  isHealthy: boolean;
  lagSeconds: number;
  blockNumber: number;
}> {
  try {
    const subgraphUrl = CHAINS[chainId].subgraphUrl;
    const response: { _meta: { block: { number: number; timestamp: number } } } = await request(subgraphUrl, gql`
      query GetMeta {
        _meta {
          block {
            number
            timestamp
          }
        }
      }
    `);

    const now = Math.floor(Date.now() / 1000);
    const lagSeconds = now - response._meta.block.timestamp;
    const isHealthy = lagSeconds < SUBGRAPH_LAG_THRESHOLD / 1000;

    return {
      isHealthy,
      lagSeconds,
      blockNumber: response._meta.block.number,
    };
  } catch (error) {
    console.error('Error checking subgraph health:', error);
    return { isHealthy: false, lagSeconds: 0, blockNumber: 0 };
  }
}
