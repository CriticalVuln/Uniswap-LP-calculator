import { createPublicClient, http } from 'viem';
import { mainnet, arbitrum, optimism, base } from 'viem/chains';
import { CHAINS } from '@/lib/constants';
import { Pool, Token, TickData, ChainId } from '@/types';

// Create public clients for each chain
const clients: Record<ChainId, any> = {
  1: createPublicClient({
    chain: mainnet,
    transport: http(CHAINS[1].rpcUrl),
  }),
  42161: createPublicClient({
    chain: arbitrum,
    transport: http(CHAINS[42161].rpcUrl),
  }),
  10: createPublicClient({
    chain: optimism,
    transport: http(CHAINS[10].rpcUrl),
  }),
  8453: createPublicClient({
    chain: base,
    transport: http(CHAINS[8453].rpcUrl),
  }),
};

// Uniswap V3 Pool ABI (minimal)
const POOL_ABI = [
  {
    inputs: [],
    name: 'slot0',
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'observationIndex', type: 'uint16' },
      { name: 'observationCardinality', type: 'uint16' },
      { name: 'observationCardinalityNext', type: 'uint16' },
      { name: 'feeProtocol', type: 'uint8' },
      { name: 'unlocked', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'liquidity',
    outputs: [{ name: '', type: 'uint128' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'feeGrowthGlobal0X128',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'feeGrowthGlobal1X128',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '', type: 'int24' }],
    name: 'ticks',
    outputs: [
      { name: 'liquidityGross', type: 'uint128' },
      { name: 'liquidityNet', type: 'int128' },
      { name: 'feeGrowthOutside0X128', type: 'uint256' },
      { name: 'feeGrowthOutside1X128', type: 'uint256' },
      { name: 'tickCumulativeOutside', type: 'int56' },
      { name: 'secondsPerLiquidityOutsideX128', type: 'uint160' },
      { name: 'secondsOutside', type: 'uint32' },
      { name: 'initialized', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '', type: 'bytes32' }],
    name: 'positions',
    outputs: [
      { name: 'liquidity', type: 'uint128' },
      { name: 'feeGrowthInside0LastX128', type: 'uint256' },
      { name: 'feeGrowthInside1LastX128', type: 'uint256' },
      { name: 'tokensOwed0', type: 'uint128' },
      { name: 'tokensOwed1', type: 'uint128' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// ERC20 ABI (minimal)
const ERC20_ABI = [
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * Get pool data from chain
 */
export async function getPoolData(poolAddress: string, chainId: ChainId): Promise<Pool | null> {
  try {
    const client = clients[chainId];
    
    const [slot0, liquidity, feeGrowthGlobal0X128, feeGrowthGlobal1X128] = await client.multicall({
      contracts: [
        {
          address: poolAddress as `0x${string}`,
          abi: POOL_ABI,
          functionName: 'slot0',
        },
        {
          address: poolAddress as `0x${string}`,
          abi: POOL_ABI,
          functionName: 'liquidity',
        },
        {
          address: poolAddress as `0x${string}`,
          abi: POOL_ABI,
          functionName: 'feeGrowthGlobal0X128',
        },
        {
          address: poolAddress as `0x${string}`,
          abi: POOL_ABI,
          functionName: 'feeGrowthGlobal1X128',
        },
      ],
    });

    if (!slot0.result || !liquidity.result || !feeGrowthGlobal0X128.result || !feeGrowthGlobal1X128.result) {
      return null;
    }

    // Get token addresses from pool factory (simplified - would need factory call)
    // For now, return mock token data
    const token0: Token = {
      address: '0x0000000000000000000000000000000000000001',
      symbol: 'TOKEN0',
      name: 'Token 0',
      decimals: 18,
      chainId,
    };

    const token1: Token = {
      address: '0x0000000000000000000000000000000000000002',
      symbol: 'TOKEN1',
      name: 'Token 1',
      decimals: 18,
      chainId,
    };

    return {
      id: poolAddress,
      token0,
      token1,
      fee: 3000, // 0.3% - would get from pool
      sqrtPriceX96: slot0.result[0].toString(),
      liquidity: liquidity.result.toString(),
      tick: Number(slot0.result[1]),
      feeGrowthGlobal0X128: feeGrowthGlobal0X128.result.toString(),
      feeGrowthGlobal1X128: feeGrowthGlobal1X128.result.toString(),
      chainId,
    };
  } catch (error) {
    console.error('Error fetching pool data:', error);
    return null;
  }
}

/**
 * Get tick data from chain
 */
export async function getTickData(
  poolAddress: string,
  tick: number,
  chainId: ChainId
): Promise<TickData | null> {
  try {
    const client = clients[chainId];
    
    const result = await client.readContract({
      address: poolAddress as `0x${string}`,
      abi: POOL_ABI,
      functionName: 'ticks',
      args: [tick],
    });

    if (!result) return null;

    return {
      id: `${poolAddress}-${tick}`,
      tickIdx: tick,
      liquidityGross: result[0].toString(),
      liquidityNet: result[1].toString(),
      feeGrowthOutside0X128: result[2].toString(),
      feeGrowthOutside1X128: result[3].toString(),
    };
  } catch (error) {
    console.error('Error fetching tick data:', error);
    return null;
  }
}

/**
 * Get token information
 */
export async function getTokenInfo(tokenAddress: string, chainId: ChainId): Promise<Token | null> {
  try {
    const client = clients[chainId];
    
    const [symbol, name, decimals] = await client.multicall({
      contracts: [
        {
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'symbol',
        },
        {
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'name',
        },
        {
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'decimals',
        },
      ],
    });

    if (!symbol.result || !name.result || !decimals.result) {
      return null;
    }

    return {
      address: tokenAddress,
      symbol: symbol.result,
      name: name.result,
      decimals: Number(decimals.result),
      chainId,
    };
  } catch (error) {
    console.error('Error fetching token info:', error);
    return null;
  }
}

/**
 * Get current block number
 */
export async function getCurrentBlock(chainId: ChainId): Promise<number> {
  try {
    const client = clients[chainId];
    const blockNumber = await client.getBlockNumber();
    return Number(blockNumber);
  } catch (error) {
    console.error('Error fetching current block:', error);
    return 0;
  }
}

/**
 * Get ETH price in USD (simplified - would use Chainlink oracle)
 */
export async function getETHPriceUSD(): Promise<number> {
  // Mock price for now - in production would use Chainlink price feeds
  return 3500;
}
