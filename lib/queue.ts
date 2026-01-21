import { QueueStatus, RunStatus } from '@prisma/client';
import prisma from './prisma';

// Read MAX_PARALLEL_RUNS from environment variable or default to 1
const DEFAULT_MAX_PARALLEL_RUNS = 1;
export const MAX_PARALLEL_RUNS = 
  process.env.MAX_PARALLEL_RUNS ? 
  parseInt(process.env.MAX_PARALLEL_RUNS, 10) : 
  DEFAULT_MAX_PARALLEL_RUNS;

// Minimum delay between API calls in milliseconds
export const MIN_API_CALL_DELAY_MS = 5000; // 5 seconds

/**
 * Adds a test run to the queue
 */
export async function addToQueue(testRunId: string): Promise<{ success: boolean; queuePosition: number }> {
  try {
    // Get the highest position in the queue to add this item at the end
    const lastItem = await prisma.testQueue.findFirst({
      orderBy: {
        position: 'desc',
      },
    });

    const newPosition = lastItem ? lastItem.position + 1 : 1;

    // Create a queue entry
    const queueItem = await prisma.testQueue.create({
      data: {
        testRunId,
        position: newPosition,
        status: QueueStatus.WAITING,
      },
    });

    return {
      success: true,
      queuePosition: queueItem.position,
    };
  } catch (error) {
    console.error('Error adding to queue:', error);
    return {
      success: false,
      queuePosition: -1,
    };
  }
}

/**
 * Gets the current queue settings or creates a default entry if none exists
 * Always updates maxParallelRuns to match the environment variable
 */
export async function getQueueSettings() {
  let settings = await prisma.queueSettings.findFirst();
  
  if (!settings) {
    // Create default settings
    settings = await prisma.queueSettings.create({
      data: {
        maxParallelRuns: MAX_PARALLEL_RUNS,
      },
    });
  } else if (settings.maxParallelRuns !== MAX_PARALLEL_RUNS) {
    // Update maxParallelRuns to match environment variable if different
    console.log(`Updating maxParallelRuns from ${settings.maxParallelRuns} to ${MAX_PARALLEL_RUNS} based on environment variable`);
    settings = await prisma.queueSettings.update({
      where: { id: settings.id },
      data: {
        maxParallelRuns: MAX_PARALLEL_RUNS,
      },
    });
  }
  
  return settings;
}

/**
 * Acquires a lock on the queue to prevent concurrent processing
 * Returns true if lock was acquired, false otherwise
 */
export async function acquireQueueLock(): Promise<boolean> {
  try {
    // Get current settings
    let settings = await getQueueSettings();
    
    // Check if there's already a lock that hasn't expired
    const now = new Date();
    if (settings.isLocked && settings.lockExpiresAt && settings.lockExpiresAt > now) {
      return false;
    }
    
    // Try to acquire the lock with a 30-second expiration
    const lockExpiresAt = new Date();
    lockExpiresAt.setSeconds(lockExpiresAt.getSeconds() + 30);
    
    await prisma.queueSettings.update({
      where: { id: settings.id },
      data: {
        isLocked: true,
        lockExpiresAt,
        updatedAt: now,
      },
    });
    
    return true;
  } catch (error) {
    console.error('Error acquiring queue lock:', error);
    return false;
  }
}

/**
 * Releases the queue lock
 */
export async function releaseQueueLock(): Promise<boolean> {
  try {
    const settings = await getQueueSettings();
    
    await prisma.queueSettings.update({
      where: { id: settings.id },
      data: {
        isLocked: false,
        lockExpiresAt: null,
        updatedAt: new Date(),
      },
    });
    
    return true;
  } catch (error) {
    console.error('Error releasing queue lock:', error);
    return false;
  }
}

/**
 * Updates the timestamp when the queue was last processed
 */
export async function updateLastProcessedTime(): Promise<void> {
  try {
    const settings = await getQueueSettings();
    
    await prisma.queueSettings.update({
      where: { id: settings.id },
      data: {
        lastProcessedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Error updating last processed time:', error);
  }
}

/**
 * Gets the number of test runs currently in RUNNING status
 */
export async function getRunningTestCount(): Promise<number> {
  try {
    return await prisma.testRun.count({
      where: {
        status: RunStatus.RUNNING,
      },
    });
  } catch (error) {
    console.error('Error getting running test count:', error);
    return 0;
  }
}

/**
 * Gets the next test in the queue to process
 * Returns null if no tests are waiting or if we should wait before processing the next test
 */
export async function getNextTestToProcess(): Promise<{ queueItem: any; testRun: any } | null> {
  try {
    // Get queue settings to check when we last processed an item
    const settings = await getQueueSettings();
    
    // If we processed a test recently, check if enough time has passed
    if (settings.lastProcessedAt) {
      const now = new Date();
      const elapsedSinceLastProcess = now.getTime() - settings.lastProcessedAt.getTime();
      
      // If it hasn't been 5 seconds since our last API call, don't process anything yet
      if (elapsedSinceLastProcess < MIN_API_CALL_DELAY_MS) {
        console.log(`Not enough time elapsed since last API call (${elapsedSinceLastProcess}ms < ${MIN_API_CALL_DELAY_MS}ms)`);
        return null;
      }
    }
    
    // Get the next queued item
    const nextInQueue = await prisma.testQueue.findFirst({
      where: {
        status: QueueStatus.WAITING,
      },
      orderBy: {
        position: 'asc',
      },
      include: {
        testRun: {
          include: {
            testCase: true,
          },
        },
      },
    });
    
    if (!nextInQueue) {
      return null;
    }
    
    return {
      queueItem: nextInQueue,
      testRun: nextInQueue.testRun,
    };
  } catch (error) {
    console.error('Error getting next test to process:', error);
    return null;
  }
}

/**
 * Marks a queue item as processing and the associated test run as running
 */
export async function startProcessingQueueItem(queueItemId: string, testRunId: string): Promise<boolean> {
  try {
    // Update the queue item
    await prisma.testQueue.update({
      where: { id: queueItemId },
      data: {
        status: QueueStatus.PROCESSING,
        lastAttemptAt: new Date(),
        attempts: {
          increment: 1,
        },
      },
    });
    
    // Update the test run
    await prisma.testRun.update({
      where: { id: testRunId },
      data: {
        status: RunStatus.RUNNING,
      },
    });
    
    // Update the last processed time
    await updateLastProcessedTime();
    
    return true;
  } catch (error) {
    console.error('Error starting processing queue item:', error);
    return false;
  }
}

/**
 * Marks a queue item as completed
 */
export async function completeQueueItem(queueItemId: string): Promise<boolean> {
  try {
    await prisma.testQueue.update({
      where: { id: queueItemId },
      data: {
        status: QueueStatus.COMPLETED,
        updatedAt: new Date(),
      },
    });
    
    return true;
  } catch (error) {
    console.error('Error completing queue item:', error);
    return false;
  }
}

/**
 * Marks a queue item as failed
 */
export async function failQueueItem(queueItemId: string): Promise<boolean> {
  try {
    await prisma.testQueue.update({
      where: { id: queueItemId },
      data: {
        status: QueueStatus.FAILED,
        updatedAt: new Date(),
      },
    });
    
    return true;
  } catch (error) {
    console.error('Error failing queue item:', error);
    return false;
  }
}

/**
 * Gets statistics about the current queue
 */
export async function getQueueStats() {
  try {
    // Add try-catch for each count operation
    let totalWaiting = 0;
    let totalProcessing = 0;
    let currentlyRunning = 0;
    
    try {
      totalWaiting = await prisma.testQueue.count({
        where: {
          status: QueueStatus.WAITING,
        },
      });
    } catch (error) {
      console.error('Error counting waiting items:', error);
    }
    
    try {
      totalProcessing = await prisma.testQueue.count({
        where: {
          status: QueueStatus.PROCESSING,
        },
      });
    } catch (error) {
      console.error('Error counting processing items:', error);
    }
    
    try {
      currentlyRunning = await getRunningTestCount();
    } catch (error) {
      console.error('Error counting running tests:', error);
    }
    
    // Get queue settings
    let settings;
    try {
      settings = await getQueueSettings();
    } catch (error) {
      console.error('Error getting queue settings:', error);
      // Create default settings object if retrieval fails
      settings = {
        maxParallelRuns: MAX_PARALLEL_RUNS,
        lastProcessedAt: null
      };
    }
    
    // Calculate the estimated wait time based on queue length and processing rate
    const queueLength = totalWaiting;
    const processingRate = MIN_API_CALL_DELAY_MS / 1000; // seconds per test
    const maxParallel = settings.maxParallelRuns || MAX_PARALLEL_RUNS;
    
    // If running tests < max parallel, calculate wait time for position 1
    // Otherwise, calculate for position based on currently running tests
    const estimatedWaitSeconds = maxParallel > currentlyRunning 
      ? processingRate
      : (queueLength / maxParallel) * processingRate;
    
    return {
      waiting: totalWaiting,
      processing: totalProcessing,
      running: currentlyRunning,
      maxParallelRuns: maxParallel,
      estimatedWaitSeconds,
      lastProcessedAt: settings.lastProcessedAt,
    };
  } catch (error) {
    console.error('Error getting queue stats:', error);
    return {
      waiting: 0,
      processing: 0,
      running: 0,
      maxParallelRuns: MAX_PARALLEL_RUNS,
      estimatedWaitSeconds: 0,
      lastProcessedAt: null,
    };
  }
}

/**
 * Gets a batch of tests to process at once
 * Returns up to maxCount tests, respecting the constraints
 */
export async function getNextTestBatch(maxCount: number): Promise<{ queueItems: any[]; testRuns: any[] }> {
  try {
    // Get queue settings to check when we last processed an item
    const settings = await getQueueSettings();
    
    // If we processed a test recently, check if enough time has passed
    if (settings.lastProcessedAt) {
      const now = new Date();
      const elapsedSinceLastProcess = now.getTime() - settings.lastProcessedAt.getTime();
      
      // If it hasn't been 5 seconds since our last API call, don't process anything yet
      if (elapsedSinceLastProcess < MIN_API_CALL_DELAY_MS) {
        console.log(`Not enough time elapsed since last API call (${elapsedSinceLastProcess}ms < ${MIN_API_CALL_DELAY_MS}ms)`);
        return { queueItems: [], testRuns: [] };
      }
    }
    
    // Get multiple waiting queue items at once
    const waitingItems = await prisma.testQueue.findMany({
      where: {
        status: QueueStatus.WAITING,
      },
      orderBy: { 
        position: 'asc'
      },
      take: maxCount,
      include: {
        testRun: {
          include: {
            testCase: true,
          },
        },
      },
    });
    
    if (waitingItems.length === 0) {
      return { queueItems: [], testRuns: [] };
    }
    
    // Extract the queue items and test runs
    const queueItems = waitingItems;
    const testRuns = waitingItems.map(item => item.testRun);
    
    return { queueItems, testRuns };
  } catch (error) {
    console.error('Error getting next test batch:', error);
    return { queueItems: [], testRuns: [] };
  }
}

/**
 * Synchronizes queue settings with environment variables
 * Call this function at application startup to ensure settings are up-to-date
 */
export async function syncQueueSettings(): Promise<void> {
  console.log('Syncing queue settings with environment variables');
  try {
    const settings = await getQueueSettings();
    console.log(`Queue settings: maxParallelRuns=${settings.maxParallelRuns}, ENV value=${MAX_PARALLEL_RUNS}`);
  } catch (error) {
    console.error('Error syncing queue settings:', error);
  }
} 