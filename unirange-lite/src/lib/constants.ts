import { Chain, ChainId, Token } from '@/types';

// Get API key from environment variables
const GRAPH_API_KEY = process.env.NEXT_PUBLIC_GRAPH_API_KEY || '';
const USE_FREE_ENDPOINTS = process.env.NEXT_PUBLIC_USE_FREE_ENDPOINTS === 'true';

// Helper function to build subgraph URL
const buildSubgraphUrl = (subgraphId: string, fallbackUrl?: string) => {
  if (USE_FREE_ENDPOINTS && fallbackUrl) {
    return fallbackUrl;
  }
  
  if (!GRAPH_API_KEY) {
    console.warn('No Graph API key found. Using public Gateway URLs with rate limits.');
    return `https://gateway.thegraph.com/api/subgraphs/id/${subgraphId}`;
  }
  
  return `https://gateway-arbitrum.network.thegraph.com/api/${GRAPH_API_KEY}/subgraphs/id/${subgraphId}`;
};

export const CHAINS: Record<ChainId, Chain> = {
  1: {
    id: 1,
    name: 'Ethereum',
    rpcUrl: 'https://eth.public-rpc.com',
    subgraphUrl: buildSubgraphUrl(
      '5zvR82QoaXuFYDEKLAabtYyvNY5Mr59N2UgUU4xrp5k2',
      'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3'
    ),
    nativeCurrency: 'ETH',
    blockExplorer: 'https://etherscan.io',
  },
  42161: {
    id: 42161,
    name: 'Arbitrum One',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    subgraphUrl: buildSubgraphUrl(
      'FbCGRftH4a3yZugY7TnbYgPJVEv2LvMT6oF1fxPe9aJM',
      'https://api.thegraph.com/subgraphs/name/ianlapham/arbitrum-minimal'
    ),
    nativeCurrency: 'ETH',
    blockExplorer: 'https://arbiscan.io',
  },
  10: {
    id: 10,
    name: 'Optimism',
    rpcUrl: 'https://mainnet.optimism.io',
    subgraphUrl: buildSubgraphUrl(
      'Cghf4LfVqPiFw6fp6Y5X5Ubc8UpmUhSfJL82zwiBFLaj',
      'https://api.thegraph.com/subgraphs/name/ianlapham/optimism-post-regenesis'
    ),
    nativeCurrency: 'ETH',
    blockExplorer: 'https://optimistic.etherscan.io',
  },
  8453: {
    id: 8453,
    name: 'Base',
    rpcUrl: 'https://mainnet.base.org',
    subgraphUrl: buildSubgraphUrl(
      '3hCPRGf4z88VC5rsBKU5AA9FBBq5nF3jbKJG7VZCbhjm',
      'https://api.thegraph.com/subgraphs/name/lynnshaoyu/uniswap-v3-base'
    ),
    nativeCurrency: 'ETH',
    blockExplorer: 'https://basescan.org',
  },
};

// Common token addresses for each chain
export const COMMON_TOKENS: Record<ChainId, Token[]> = {  1: [
    {
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
      chainId: 1,
    },    {
      address: '0xA0b86a33E6275Ce4d6dE4953f765a2425a9b2d08',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      chainId: 1,
    },
    {
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
      chainId: 1,
    },
    {
      address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      symbol: 'WBTC',
      name: 'Wrapped BTC',
      decimals: 8,
      chainId: 1,
    },
  ],
  42161: [
    {
      address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
      chainId: 42161,
    },
    {
      address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      chainId: 42161,
    },
    {
      address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
      chainId: 42161,
    },
    {
      address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
      symbol: 'WBTC',
      name: 'Wrapped BTC',
      decimals: 8,
      chainId: 42161,
    },
  ],
  10: [
    {
      address: '0x4200000000000000000000000000000000000006',
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
      chainId: 10,
    },
    {
      address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      chainId: 10,
    },
    {
      address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
      chainId: 10,
    },
    {
      address: '0x68f180fcCe6836688e9084f035309E29Bf0A2095',
      symbol: 'WBTC',
      name: 'Wrapped BTC',
      decimals: 8,
      chainId: 10,
    },
  ],
  8453: [
    {
      address: '0x4200000000000000000000000000000000000006',
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
      chainId: 8453,
    },
    {
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      chainId: 8453,
    },
    {
      address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
      chainId: 8453,
    },
    {
      address: '0x9C9e5fD8bbc25984B178FdCE6117Defa39d2db39',
      symbol: 'WBTC',
      name: 'Wrapped BTC',
      decimals: 8,
      chainId: 8453,
    },
  ],
};

// V4 PoolManager address (mainnet beta)
export const V4_POOL_MANAGER = '0x38EB8B22Df3Ae7fb21e92881151B365Df14ba967';

// Common fee tiers
export const FEE_TIERS = [500, 3000, 10000]; // 0.05%, 0.3%, 1%

// Constants for calculations
export const Q96 = BigInt(2) ** BigInt(96);
export const Q128 = BigInt(2) ** BigInt(128);
export const MAX_UINT128 = BigInt(2) ** BigInt(128) - BigInt(1);

// Cache settings
export const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
export const MAX_CACHE_ENTRIES = 1000;

// API limits
export const SUBGRAPH_LAG_THRESHOLD = 30 * 60 * 1000; // 30 minutes
export const MAX_BLOCKS_TO_QUERY = 1000;
