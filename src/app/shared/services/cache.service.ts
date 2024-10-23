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
  private ttl = 5 * 60 * 1000; // 5 Minuten
  private defaultTtl = 5 * 60 * 1000; // 5 Minuten

  constructor() {
    if (isDevMode()) {
      (window as any).cacheService = this;
    }
    this.loadCacheFromLocalStorage();
  }

  /**
   * Loads cache entries from localStorage into the in-memory cache.
   */
  private loadCacheFromLocalStorage(): void {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      try {
        const entryStr = localStorage.getItem(key);
        if (entryStr) {
          const entry: CacheEntry<any> = JSON.parse(entryStr);
          if (Date.now() < entry.expiry) {
            this.cache.set(key, entry);
            if (isDevMode()) {
              console.log(`[CacheService] Loaded key from localStorage: ${key}`);
            }
          } else {
            localStorage.removeItem(key);
            if (isDevMode()) {
              console.log(`[CacheService] Removed expired key from localStorage: ${key}`);
            }
          }
        }
      } catch (error) {
        console.error(`Error loading cache key "${key}" from localStorage:`, error);
        localStorage.removeItem(key);
      }
    });
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
        console.log(`[CacheService] Cache miss for key: ${key}`);
      }
      return null;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      localStorage.removeItem(key);
      if (isDevMode()) {
        console.log(`[CacheService] Cache expired for key: ${key}`);
      }
      return null;
    }

    if (!entry.subject) {
      entry.subject = new BehaviorSubject<T>(entry.data);
    } else {
      entry.subject.next(entry.data);
    }

    if (isDevMode()) {
      console.log(`[CacheService] Cache hit for key: ${key}`);
    }
    return entry.subject.asObservable();
  }

  /**
   * Sets cached data for a specific key and stores it in localStorage.
   * @param key - The unique cache key.
   * @param data - The data to cache.
   * @param ttl - Optional: Individual TTL in milliseconds.
   */
  set<T>(key: string, data: T, ttl?: number): void {
    let entry = this.cache.get(key);
    const effectiveTtl = ttl !== undefined ? ttl : this.defaultTtl;
    const expiry = Date.now() + effectiveTtl;

    if (!entry) {
      entry = {
        data,
        expiry,
        subject: new BehaviorSubject<T>(data),
        ttl: effectiveTtl
      };
      this.cache.set(key, entry);
    } else {
      entry.data = data;
      entry.expiry = Date.now() + effectiveTtl;
      entry.ttl = effectiveTtl;
      if (entry.subject) {
        entry.subject.next(data);
      }
    }

    try {
      localStorage.setItem(key, JSON.stringify({ data, expiry }));
      if (isDevMode()) {
        console.log(
          `[CacheService] Cache set for key: ${key} | Expires at: ${new Date(
            expiry
          ).toLocaleTimeString()}`
        );
      }
    } catch (error) {
      console.error(`Error setting cache key "${key}" in localStorage:`, error);
    }
  }

  /**
   * Updates cached data for a specific key and stores it in localStorage.
   * @param key - The unique cache key.
   * @param data - The new data to cache.
   */
  update<T>(key: string, data: T): void {
    this.set(key, data);
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
      console.log(`[CacheService] Fetching data for key: ${key}`);
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
    localStorage.removeItem(key);
    if (isDevMode()) {
      console.log(`[CacheService] Cache cleared for key: ${key}`);
    }
  }

  /**
   * Clears all cache entries.
   */
  clearAll(): void {
    this.cache.clear();
    localStorage.clear();
    if (isDevMode()) {
      console.log('[CacheService] All caches cleared');
    }
  }
}
