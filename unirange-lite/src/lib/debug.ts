// Debug utilities for testing pool search
import { getPoolByTokens, getPopularPools } from './subgraph';
import { COMMON_TOKENS } from './constants';
import { ChainId } from '@/types';

// Test function to verify pool search is working
export async function testPoolSearch() {
  console.log('🔍 Testing pool search...');
  
  // Test WETH/USDC pool on Ethereum mainnet
  const wethAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
  const usdcAddress = '0xA0b86a33E6275Ce4d6dE4953f765a2425a9b2d08';
  const feeTier = 3000; // 0.3%
  const chainId: ChainId = 1; // Ethereum mainnet
  
  console.log('Searching for WETH/USDC 0.3% pool...');
  
  try {
    const pool = await getPoolByTokens(wethAddress, usdcAddress, feeTier, chainId);
    
    if (pool) {
      console.log('✅ Pool found!', pool);
      return pool;
    } else {
      console.log('❌ Pool not found');
      
      // Let's try to get popular pools to see what's available
      console.log('Fetching popular pools to see what\'s available...');
      const popularPools = await getPopularPools(chainId, 10);
      console.log('Popular pools:', popularPools);
      
      return null;
    }
  } catch (error) {
    console.error('❌ Error during pool search:', error);
    return null;
  }
}

// Test with different token combinations
export async function testMultiplePools() {
  const tests = [
    // Ethereum mainnet tests
    {
      name: 'WETH/USDC 0.3%',
      token0: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      token1: '0xA0b86a33E6275Ce4d6dE4953f765a2425a9b2d08',
      fee: 3000,
      chainId: 1 as ChainId,
    },
    {
      name: 'WETH/USDC 0.05%',
      token0: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      token1: '0xA0b86a33E6275Ce4d6dE4953f765a2425a9b2d08',
      fee: 500,
      chainId: 1 as ChainId,
    },
    {
      name: 'WETH/USDT 0.3%',
      token0: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      token1: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      fee: 3000,
      chainId: 1 as ChainId,
    },
  ];
  
  console.log('🧪 Testing multiple pool combinations...');
  
  for (const test of tests) {
    console.log(`\n🔍 Testing ${test.name}...`);
    
    try {
      const pool = await getPoolByTokens(
        test.token0,
        test.token1,
        test.fee,
        test.chainId
      );
      
      if (pool) {
        console.log(`✅ ${test.name} found:`, {
          id: pool.id,
          tvl: pool.totalValueLockedUSD,
          volume: pool.volumeUSD,
        });
      } else {
        console.log(`❌ ${test.name} not found`);
      }
    } catch (error) {
      console.error(`❌ Error testing ${test.name}:`, error);
    }
  }
}

// Make functions available globally for browser console testing
if (typeof window !== 'undefined') {
  (window as any).testPoolSearch = testPoolSearch;
  (window as any).testMultiplePools = testMultiplePools;
}
