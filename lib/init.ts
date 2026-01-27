// Keep track of initialization status
let initialized = false;

/**
 * Initialize application services
 * Call this at the beginning of API routes that require initialization
 */
export async function initServices(): Promise<void> {
  if (initialized) {
    return;
  }
  
  try {
    console.log('Initializing application services...');
    
    // Add any initialization logic here
    
    console.log('Application services initialized successfully');
    initialized = true;
  } catch (error) {
    console.error('Error initializing application services:', error);
    // Don't set initialized=true on error to allow retry next time
  }
}
