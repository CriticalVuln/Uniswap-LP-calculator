import { Pool, Token } from '@/types';

/**
 * Calculate price from tick
 * Price = 1.0001^tick
 */
export function tickToPrice(tick: number): number {
  return Math.pow(1.0001, tick);
}

/**
 * Calculate tick from price
 * tick = log(price) / log(1.0001)
 */
export function priceToTick(price: number): number {
  return Math.log(price) / Math.log(1.0001);
}

/**
 * Convert tick to human-readable price for a specific token pair
 * For token0/token1 pair, the price represents how many token1 per token0
 */
export function tickToReadablePrice(
  tick: number,
  token0: Token,
  token1: Token,
  invert: boolean = false
): number {
  const rawPrice = tickToPrice(tick);
  
  // Adjust for token decimals
  const decimalAdjustment = Math.pow(10, token0.decimals - token1.decimals);
  const adjustedPrice = rawPrice * decimalAdjustment;
  
  // If invert is true, return token0 per token1 instead of token1 per token0
  return invert ? 1 / adjustedPrice : adjustedPrice;
}

/**
 * Convert human-readable price to tick for a specific token pair
 */
export function readablePriceToTick(
  price: number,
  token0: Token,
  token1: Token,
  invert: boolean = false
): number {
  // If invert is true, the input price is token0 per token1, so invert it
  const actualPrice = invert ? 1 / price : price;
  
  // Adjust for token decimals
  const decimalAdjustment = Math.pow(10, token0.decimals - token1.decimals);
  const adjustedPrice = actualPrice / decimalAdjustment;
  
  return priceToTick(adjustedPrice);
}

/**
 * Get the current price of a pool in human-readable format
 */
export function getCurrentPoolPrice(
  pool: Pool,
  invert: boolean = false
): number {
  return tickToReadablePrice(pool.tick, pool.token0, pool.token1, invert);
}

/**
 * Format price for display with appropriate decimal places
 */
export function formatPrice(price: number, maxDecimals: number = 6): string {
  if (price === 0) return '0';
  
  // For very small numbers, use scientific notation
  if (price < 0.000001) {
    return price.toExponential(3);
  }
  
  // For large numbers, use compact notation
  if (price > 1000000) {
    return (price / 1000000).toFixed(2) + 'M';
  }
  
  if (price > 1000) {
    return (price / 1000).toFixed(2) + 'K';
  }
  
  // For normal numbers, use appropriate decimal places
  const decimalPlaces = Math.min(maxDecimals, Math.max(0, -Math.floor(Math.log10(Math.abs(price))) + 3));
  return price.toFixed(decimalPlaces);
}

/**
 * Determine which token should be used as the base for price display
 * Typically stablecoins (USDC, USDT, DAI) are preferred as quote tokens
 */
export function shouldInvertDisplay(token0: Token, token1: Token): boolean {
  const stablecoins = ['USDC', 'USDT', 'DAI', 'BUSD', 'FRAX'];
  const wrappers = ['WETH', 'WBTC'];
  
  // If token1 is a stablecoin and token0 is not, don't invert (show X USDC per ETH)
  if (stablecoins.includes(token1.symbol) && !stablecoins.includes(token0.symbol)) {
    return false;
  }
  
  // If token0 is a stablecoin and token1 is not, invert (show X USDC per ETH becomes Y ETH per USDC)
  if (stablecoins.includes(token0.symbol) && !stablecoins.includes(token1.symbol)) {
    return true;
  }
  
  // For wrapper tokens like WETH, prefer them as base
  if (wrappers.includes(token1.symbol) && !wrappers.includes(token0.symbol)) {
    return true;
  }
  
  // Default: don't invert
  return false;
}

/**
 * Get price range suggestions based on current pool price
 */
export function getPriceRangeSuggestions(
  currentPrice: number,
  token0: Token,
  token1: Token
): { tight: [number, number]; normal: [number, number]; wide: [number, number] } {
  const suggestions = {
    tight: [currentPrice * 0.95, currentPrice * 1.05] as [number, number],
    normal: [currentPrice * 0.8, currentPrice * 1.25] as [number, number],
    wide: [currentPrice * 0.5, currentPrice * 2] as [number, number],
  };
  
  return suggestions;
}

/**
 * Validate if a price range is reasonable
 */
export function validatePriceRange(
  lowerPrice: number,
  upperPrice: number,
  currentPrice: number
): { isValid: boolean; error?: string } {
  if (lowerPrice <= 0 || upperPrice <= 0) {
    return { isValid: false, error: 'Prices must be positive' };
  }
  
  if (lowerPrice >= upperPrice) {
    return { isValid: false, error: 'Lower price must be less than upper price' };
  }
  
  if (upperPrice < currentPrice || lowerPrice > currentPrice) {
    return { 
      isValid: false, 
      error: 'Current price is outside your range. You may not earn fees until price moves into range.' 
    };
  }
  
  // Check for extremely wide ranges (more than 100x)
  if (upperPrice / lowerPrice > 100) {
    return { 
      isValid: false, 
      error: 'Price range is too wide. Consider a smaller range for better capital efficiency.' 
    };
  }
  
  return { isValid: true };
}
