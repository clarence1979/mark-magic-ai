// API Key Cache Service
// Implements caching with specific variable names and access methods
class ApiKeyCache {
  private static instance: ApiKeyCache;
  private readonly CACHE_KEY = 'globalApiKey';
  private readonly FALLBACK_KEY = 'sharedApiKey';

  constructor() {
    // Set up cache on window object for external access
    if (typeof window !== 'undefined') {
      (window as any).apiKeyCache = this;
    }
  }

  static getInstance(): ApiKeyCache {
    if (!ApiKeyCache.instance) {
      ApiKeyCache.instance = new ApiKeyCache();
    }
    return ApiKeyCache.instance;
  }

  // Store API key in both localStorage and memory
  set apiKey(value: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.CACHE_KEY, value);
      localStorage.setItem(this.FALLBACK_KEY, value);
      // Also store in window for direct access
      (window as any).globalApiKey = value;
      (window as any).sharedApiKey = value;
    }
  }

  // Get API key with fallback mechanism
  get apiKey(): string {
    if (typeof window === 'undefined') return '';
    
    // Try memory first
    const memoryKey = (window as any).globalApiKey || (window as any).sharedApiKey;
    if (memoryKey) return memoryKey;

    // Fallback to localStorage
    return localStorage.getItem(this.CACHE_KEY) || 
           localStorage.getItem(this.FALLBACK_KEY) || 
           '';
  }

  // Check if API key exists
  hasApiKey(): boolean {
    return !!this.apiKey;
  }

  // Clear all cached data
  clear(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.CACHE_KEY);
      localStorage.removeItem(this.FALLBACK_KEY);
      localStorage.removeItem('openai_api_key'); // Legacy key
      delete (window as any).globalApiKey;
      delete (window as any).sharedApiKey;
    }
  }

  // Sync all API input fields with cached value
  syncInputFields(): void {
    if (typeof window === 'undefined') return;
    
    const apiKey = this.apiKey;
    if (!apiKey) return;

    // Find all API key input fields and sync them
    const inputs = document.querySelectorAll('input[type="password"], input[placeholder*="sk-"], input[id*="api"], input[name*="api"]');
    inputs.forEach((input) => {
      const inputElement = input as HTMLInputElement;
      if (inputElement.value !== apiKey) {
        inputElement.value = apiKey;
        // Trigger change event for React state updates
        const event = new Event('input', { bubbles: true });
        inputElement.dispatchEvent(event);
      }
    });
  }
}

// Export singleton instance
export const cache = ApiKeyCache.getInstance();

// Also make it available on window for Programs read from cache.apiKey
if (typeof window !== 'undefined') {
  (window as any).cache = cache;
}