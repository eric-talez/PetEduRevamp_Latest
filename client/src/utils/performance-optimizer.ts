
/**
 * 성능 최적화 유틸리티
 * 이미지 최적화, 코드 스플리팅, 캐싱 전략 구현
 */

// 이미지 최적화
export class ImageOptimizer {
  private static cache = new Map<string, string>();
  
  /**
   * 반응형 이미지 URL 생성
   */
  static getResponsiveImageUrl(
    originalUrl: string, 
    width: number, 
    height?: number,
    quality: number = 80
  ): string {
    const cacheKey = `${originalUrl}-${width}-${height}-${quality}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    // 이미지 최적화 URL 생성 (실제 CDN 서비스 연동 필요)
    const optimizedUrl = `${originalUrl}?w=${width}${height ? `&h=${height}` : ''}&q=${quality}`;
    this.cache.set(cacheKey, optimizedUrl);
    
    return optimizedUrl;
  }
  
  /**
   * WebP 지원 여부 확인 및 최적 포맷 선택
   */
  static async getOptimalImageFormat(originalUrl: string): Promise<string> {
    const supportsWebP = await this.checkWebPSupport();
    const supportsAVIF = await this.checkAVIFSupport();
    
    if (supportsAVIF) {
      return originalUrl.replace(/\.(jpg|jpeg|png)$/i, '.avif');
    } else if (supportsWebP) {
      return originalUrl.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    }
    
    return originalUrl;
  }
  
  private static async checkWebPSupport(): Promise<boolean> {
    return new Promise((resolve) => {
      const webP = new Image();
      webP.onload = webP.onerror = () => resolve(webP.height === 2);
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  }
  
  private static async checkAVIFSupport(): Promise<boolean> {
    return new Promise((resolve) => {
      const avif = new Image();
      avif.onload = avif.onerror = () => resolve(avif.height === 2);
      avif.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';
    });
  }
}

// 코드 스플리팅을 위한 동적 임포트 래퍼
export class CodeSplitting {
  private static componentCache = new Map<string, Promise<any>>();
  
  /**
   * 지연 로딩 컴포넌트 생성
   */
  static lazyComponent<T = any>(importFn: () => Promise<{ default: T }>): Promise<T> {
    const key = importFn.toString();
    
    if (!this.componentCache.has(key)) {
      this.componentCache.set(key, importFn().then(module => module.default));
    }
    
    return this.componentCache.get(key)!;
  }
  
  /**
   * 페이지별 청크 분리
   */
  static async loadPageChunk(pageName: string) {
    try {
      switch (pageName) {
        case 'admin':
          return await import('../pages/admin/AdminHome');
        case 'shop':
          return await import('../pages/shop/index');
        case 'courses':
          return await import('../pages/courses/index');
        case 'community':
          return await import('../pages/community/index');
        default:
          return await import('../pages/Home');
      }
    } catch (error) {
      console.error(`Failed to load chunk for ${pageName}:`, error);
      throw error;
    }
  }
}

// 캐싱 전략
export class CacheManager {
  private static cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  /**
   * 캐시 저장
   */
  static set(key: string, data: any, ttlMinutes: number = 30): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000
    });
  }
  
  /**
   * 캐시 조회
   */
  static get<T = any>(key: string): T | null {
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data as T;
  }
  
  /**
   * API 응답 캐싱
   */
  static async cachedFetch<T = any>(
    url: string, 
    options: RequestInit = {}, 
    ttlMinutes: number = 10
  ): Promise<T> {
    const cacheKey = `api:${url}:${JSON.stringify(options)}`;
    const cached = this.get<T>(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      this.set(cacheKey, data, ttlMinutes);
      
      return data;
    } catch (error) {
      console.error(`Cached fetch failed for ${url}:`, error);
      throw error;
    }
  }
  
  /**
   * 캐시 정리
   */
  static cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > value.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// 성능 모니터링
export class PerformanceTracker {
  private static metrics = new Map<string, number[]>();
  
  /**
   * 성능 측정 시작
   */
  static startMeasure(name: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (!this.metrics.has(name)) {
        this.metrics.set(name, []);
      }
      
      this.metrics.get(name)!.push(duration);
      
      // 성능 임계값 체크
      if (duration > 1000) { // 1초 이상
        console.warn(`⚠️ 성능 경고: ${name} 실행 시간 ${duration.toFixed(2)}ms`);
      }
    };
  }
  
  /**
   * 성능 통계 조회
   */
  static getMetrics(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const stats: Record<string, any> = {};
    
    for (const [name, times] of this.metrics.entries()) {
      if (times.length > 0) {
        stats[name] = {
          avg: times.reduce((sum, time) => sum + time, 0) / times.length,
          min: Math.min(...times),
          max: Math.max(...times),
          count: times.length
        };
      }
    }
    
    return stats;
  }
}

// 자동 캐시 정리 (메모리 누수 방지)
let cleanupInterval: NodeJS.Timeout | null = null;

export const startCacheCleanup = () => {
  if (cleanupInterval) return;
  
  cleanupInterval = setInterval(() => {
    CacheManager.cleanup();
    
    // 성능 메트릭도 정리
    const metrics = PerformanceTracker.getMetrics();
    Object.keys(metrics).forEach(key => {
      if (metrics[key].count > 100) {
        // 오래된 메트릭 제거
        PerformanceTracker['metrics'].set(key, 
          PerformanceTracker['metrics'].get(key)?.slice(-50) || []
        );
      }
    });
  }, 5 * 60 * 1000); // 5분마다 정리
};

export const stopCacheCleanup = () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
};

// 페이지 언로드 시 정리
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', stopCacheCleanup);
  startCacheCleanup();
}
