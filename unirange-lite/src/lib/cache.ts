import { get, set, del, keys, clear } from 'idb-keyval';
import { CachedAPRData } from '@/types';
import { CACHE_TTL, MAX_CACHE_ENTRIES } from '@/lib/constants';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class Cache {
  private prefix: string;

  constructor(prefix = 'unirange') {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  /**
   * Store data in cache with TTL
   */
  async set<T>(key: string, data: T, ttl = CACHE_TTL): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
      };
      await set(this.getKey(key), entry);
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Get data from cache if not expired
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const entry: CacheEntry<T> | undefined = await get(this.getKey(key));
      
      if (!entry) return null;

      const isExpired = Date.now() - entry.timestamp > entry.ttl;
      if (isExpired) {
        await this.delete(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Delete data from cache
   */
  async delete(key: string): Promise<void> {
    try {
      await del(this.getKey(key));
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * Clear all cache entries for this prefix
   */
  async clear(): Promise<void> {
    try {
      const allKeys = await keys();
      const ourKeys = allKeys.filter(key => 
        typeof key === 'string' && key.startsWith(this.prefix)
      );
      
      await Promise.all(ourKeys.map(key => del(key)));
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Clean up expired entries and enforce size limits
   */
  async cleanup(): Promise<void> {
    try {
      const allKeys = await keys();
      const ourKeys = allKeys.filter(key => 
        typeof key === 'string' && key.startsWith(this.prefix)
      );

      const entries: Array<{ key: string; entry: CacheEntry<any> }> = [];
      
      // Get all entries and check expiration
      for (const key of ourKeys) {
        const entry: CacheEntry<any> | undefined = await get(key);
        if (entry) {
          const isExpired = Date.now() - entry.timestamp > entry.ttl;
          if (isExpired) {
            await del(key);
          } else {
            entries.push({ key: key as string, entry });
          }
        }
      }

      // Enforce size limit - remove oldest entries
      if (entries.length > MAX_CACHE_ENTRIES) {
        entries.sort((a, b) => a.entry.timestamp - b.entry.timestamp);
        const toRemove = entries.slice(0, entries.length - MAX_CACHE_ENTRIES);
        await Promise.all(toRemove.map(({ key }) => del(key)));
      }
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    totalSize: number;
    oldestEntry: number;
    newestEntry: number;
  }> {
    try {
      const allKeys = await keys();
      const ourKeys = allKeys.filter(key => 
        typeof key === 'string' && key.startsWith(this.prefix)
      );

      let totalSize = 0;
      let oldestEntry = Date.now();
      let newestEntry = 0;

      for (const key of ourKeys) {
        const entry: CacheEntry<any> | undefined = await get(key);
        if (entry) {
          totalSize += JSON.stringify(entry).length;
          oldestEntry = Math.min(oldestEntry, entry.timestamp);
          newestEntry = Math.max(newestEntry, entry.timestamp);
        }
      }

      return {
        totalEntries: ourKeys.length,
        totalSize,
        oldestEntry: oldestEntry === Date.now() ? 0 : oldestEntry,
        newestEntry,
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return { totalEntries: 0, totalSize: 0, oldestEntry: 0, newestEntry: 0 };
    }
  }
}

// Create cache instances
export const aprCache = new Cache('apr');
export const poolCache = new Cache('pool');
export const priceCache = new Cache('price');

/**
 * APR-specific cache functions
 */
export class APRCache {
  /**
   * Generate cache key for APR data
   */
  private static getAPRKey(
    poolId: string,
    tickLower: number,
    tickUpper: number,
    chainId: number
  ): string {
    return `${chainId}:${poolId}:${tickLower}:${tickUpper}`;
  }

  /**
   * Store APR data
   */
  static async setAPR(
    poolId: string,
    tickLower: number,
    tickUpper: number,
    chainId: number,
    aprData: Omit<CachedAPRData, 'timestamp' | 'poolId' | 'tickLower' | 'tickUpper'>
  ): Promise<void> {
    const key = this.getAPRKey(poolId, tickLower, tickUpper, chainId);
    const cachedData: CachedAPRData = {
      ...aprData,
      timestamp: Date.now(),
      poolId,
      tickLower,
      tickUpper,
    };
    await aprCache.set(key, cachedData);
  }

  /**
   * Get APR data
   */
  static async getAPR(
    poolId: string,
    tickLower: number,
    tickUpper: number,
    chainId: number
  ): Promise<CachedAPRData | null> {
    const key = this.getAPRKey(poolId, tickLower, tickUpper, chainId);
    return aprCache.get<CachedAPRData>(key);
  }

  /**
   * Get all cached APR data for a pool
   */
  static async getPoolAPRHistory(poolId: string, chainId: number): Promise<CachedAPRData[]> {
    try {
      const allKeys = await keys();
      const poolPrefix = `unirange:apr:${chainId}:${poolId}:`;
      const poolKeys = allKeys.filter(key => 
        typeof key === 'string' && key.startsWith(poolPrefix)
      );

      const aprData: CachedAPRData[] = [];
      
      for (const key of poolKeys) {
        const data = await get(key);
        if (data && data.data) {
          aprData.push(data.data);
        }
      }

      return aprData.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error getting APR history:', error);
      return [];
    }
  }

  /**
   * Clean up old APR data
   */
  static async cleanup(): Promise<void> {
    await aprCache.cleanup();
  }
}

/**
 * Initialize cache and set up periodic cleanup
 */
export async function initializeCache(): Promise<void> {
  // Clean up expired entries on startup
  await Promise.all([
    aprCache.cleanup(),
    poolCache.cleanup(),
    priceCache.cleanup(),
  ]);

  // Set up periodic cleanup (every 5 minutes)
  if (typeof window !== 'undefined') {
    setInterval(async () => {
      await Promise.all([
        aprCache.cleanup(),
        poolCache.cleanup(),
        priceCache.cleanup(),
      ]);
    }, 5 * 60 * 1000);
  }
}

/**
 * Export data for sharing
 */
export async function exportCacheData(): Promise<string> {
  try {
    const allKeys = await keys();
    const ourKeys = allKeys.filter(key => 
      typeof key === 'string' && key.startsWith('unirange:')
    );

    const exportData: Record<string, any> = {};
    
    for (const key of ourKeys) {
      const data = await get(key);
      if (data) {
        exportData[key as string] = data;
      }
    }

    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error('Export cache error:', error);
    return '{}';
  }
}

/**
 * Import data
 */
export async function importCacheData(jsonData: string): Promise<void> {
  try {
    const data = JSON.parse(jsonData);
    
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('unirange:')) {
        await set(key, value);
      }
    }
  } catch (error) {
    console.error('Import cache error:', error);
  }
}
