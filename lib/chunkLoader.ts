// Chunk loading utilities with retry logic
export class ChunkLoader {
  private static retryAttempts = 3;
  private static retryDelay = 1000;

  static async loadChunk(chunkId: string, retryCount = 0): Promise<any> {
    try {
      // Try to load the chunk
      const chunk = await import(/* webpackChunkName: "[request]" */ `../app/page`);
      return chunk;
    } catch (error) {
      console.error(`Chunk load error for ${chunkId}, attempt ${retryCount + 1}:`, error);
      
      if (retryCount < this.retryAttempts) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * (retryCount + 1)));
        return this.loadChunk(chunkId, retryCount + 1);
      }
      
      // If all retries failed, throw the error
      throw error;
    }
  }

  static handleChunkError(error: Error, chunkId?: string) {
    console.error('Chunk load error:', error);
    
    // Check if it's a chunk loading error
    if (error.message.includes('Loading chunk') || error.message.includes('ChunkLoadError')) {
      // Clear service worker cache and reload
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => {
            registration.unregister();
          });
        });
      }
      
      // Clear all caches
      if ('caches' in window) {
        caches.keys().then(cacheNames => {
          cacheNames.forEach(cacheName => {
            caches.delete(cacheName);
          });
        });
      }
      
      // Reload the page after clearing caches
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }
}

// Global error handler for chunk loading
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (event.message && event.message.includes('Loading chunk')) {
      ChunkLoader.handleChunkError(event.error || new Error(event.message));
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.message && event.reason.message.includes('Loading chunk')) {
      event.preventDefault();
      ChunkLoader.handleChunkError(event.reason);
    }
  });
}
