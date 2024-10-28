import { Injectable, isDevMode } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { shareReplay, tap } from 'rxjs/operators';

/**
 * Represents a cache entry with data and expiry time.
 */
interface CacheEntry<T> {
  data: T;
  expiry: number;
  subject?: BehaviorSubject<T>;
  ttl?: number;
}

@Injectable({
  providedIn: 'root',
})
export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTtl = 5 * 60 * 1000; // 5 Minuten
  private cleanupInterval = 60 * 1000; // 1 Minute

  constructor() {
    if (isDevMode()) {
      (window as any).cacheService = this;
    }
    this.startCleanupTask();
  }
  private startCleanupTask(): void {
    setInterval(() => {
      const now = Date.now();
      this.cache.forEach((entry, key) => {
        if (now > entry.expiry) {
          this.cache.delete(key);
          if (isDevMode()) {
            // console.log(`[CacheService] Auto-removed expired key: ${key}`);
          }
        }
      });
    }, this.cleanupInterval);
  }


  /**
   * Retrieves cached data by key.
   * @param key - The unique cache key.
   * @returns An Observable of the cached data or null if not found/expired.
   */
  get<T>(key: string): Observable<T> | null {
    const entry = this.cache.get(key);
    if (!entry) {
      if (isDevMode()) {
        // console.log(`[CacheService] Cache miss for key: ${key}`);
      }
      return null;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      if (isDevMode()) {
        // console.log(`[CacheService] Cache expired for key: ${key}`);
      }
      return null;
    }

    if (isDevMode()) {
      // console.log(`[CacheService] Cache hit for key: ${key}`);
    }
    return entry.subject ? entry.subject.asObservable() : null;
  }

  /**
   * Sets cached data for a specific key.
   * @param key - The unique cache key.
   * @param data - The data to cache.
   * @param ttl - Optional: Individual TTL in milliseconds.
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const effectiveTtl = ttl !== undefined ? ttl : this.defaultTtl;
    const expiry = Date.now() + effectiveTtl;

    const existingEntry = this.cache.get(key);
    if (existingEntry && existingEntry.subject) {
      // Update existing entry and notify subscribers
      existingEntry.data = data;
      existingEntry.expiry = expiry;
      existingEntry.subject.next(data);
    } else {
      // Create new entry
      const subject = new BehaviorSubject<T>(data);
      this.cache.set(key, {
        data,
        expiry,
        subject,
        ttl: effectiveTtl,
      });
    }

    if (isDevMode()) {
      // console.log(`[CacheService] Cache set for key: ${key} | Expires at: ${new Date(expiry).toLocaleTimeString()}`);
    }
  }


  /**
   * Wraps a fetch function with caching logic.
   * @param key - The unique cache key.
   * @param fetchFn - The function to fetch data if not cached.
   * @returns An Observable of the cached or fetched data.
   */
  wrap<T>(key: string, fetchFn: () => Observable<T>): Observable<T> {
    const cached = this.get<T>(key);
    if (cached) {
      return cached;
    }

    if (isDevMode()) {
      // console.log(`[CacheService] Fetching data for key: ${key}`);
    }

    const observable = fetchFn().pipe(
      tap((data) => {
        this.set(key, data);
      }),
      shareReplay(1)
    );

    return observable;
  }

  /**
   * Clears a specific cache entry.
   * @param key - The unique cache key to clear.
   */
  clear(key: string): void {
    this.cache.delete(key);
    if (isDevMode()) {
      // console.log(`[CacheService] Cache cleared for key: ${key}`);
    }
  }

  /**
   * Clears all cache entries.
   */
  clearAll(): void {
    this.cache.clear();
    if (isDevMode()) {
      // console.log('[CacheService] All caches cleared');
    }
  }
}
