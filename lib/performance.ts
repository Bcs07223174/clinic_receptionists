// Performance monitoring utilities
export const performanceLogger = {
  startTime: Date.now(),
  
  // Log API response times
  logApiCall: (endpoint: string, startTime: number, success: boolean = true) => {
    const duration = Date.now() - startTime;
    const status = success ? '✅' : '❌';
    console.log(`${status} API ${endpoint} - ${duration}ms`);
    
    // Log slow queries (over 2 seconds)
    if (duration > 2000) {
      console.warn(`⚠️ Slow API call detected: ${endpoint} took ${duration}ms`);
    }
  },
  
  // Log database query performance
  logDbQuery: (collection: string, operation: string, startTime: number, resultCount?: number) => {
    const duration = Date.now() - startTime;
    const count = resultCount !== undefined ? ` (${resultCount} results)` : '';
    console.log(`📊 DB ${collection}.${operation} - ${duration}ms${count}`);
    
    // Log slow database queries (over 1 second)
    if (duration > 1000) {
      console.warn(`⚠️ Slow DB query: ${collection}.${operation} took ${duration}ms`);
    }
  },
  
  // Memory usage tracker
  logMemoryUsage: () => {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      console.log(`🧠 Memory: ${Math.round(usage.heapUsed / 1024 / 1024)}MB used, ${Math.round(usage.heapTotal / 1024 / 1024)}MB total`);
    }
  },
  
  // Cache hit rate tracker
  cacheStats: {
    hits: 0,
    misses: 0,
    logHit: () => {
      performanceLogger.cacheStats.hits++;
    },
    logMiss: () => {
      performanceLogger.cacheStats.misses++;
    },
    getHitRate: () => {
      const total = performanceLogger.cacheStats.hits + performanceLogger.cacheStats.misses;
      return total > 0 ? (performanceLogger.cacheStats.hits / total * 100).toFixed(1) : '0.0';
    }
  }
};
