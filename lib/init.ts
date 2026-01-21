import { syncQueueSettings } from './queue';

// Keep track of initialization status
let initialized = false;

/**
 * Initialize application services
 * Call this at the beginning of API routes that use queue operations
 */
export async function initServices(): Promise<void> {
  if (initialized) {
    return;
  }
  
  try {
    console.log('Initializing application services...');
    
    // Sync queue settings with environment variables
    await syncQueueSettings();
    
    console.log('Application services initialized successfully');
    initialized = true;
  } catch (error) {
    console.error('Error initializing application services:', error);
    // Don't set initialized=true on error to allow retry next time
  }
} 