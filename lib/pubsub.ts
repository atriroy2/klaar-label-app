import { PubSub } from '@google-cloud/pubsub';

// Lazy initialization - only create Pub/Sub client when needed
let pubsub: PubSub | null = null;
let isGcpConfigured: boolean | null = null;

/**
 * Check if GCP is configured and initialize Pub/Sub client if needed
 */
function getPubSubClient(): PubSub {
  // Check if GCP is configured (only check once)
  if (isGcpConfigured === null) {
    const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID;
    const PUBSUB_TOPIC = process.env.PUBSUB_TOPIC;
    const GCS_SERVICE_ACCOUNT_KEY = process.env.GCS_SERVICE_ACCOUNT_KEY;
    
    isGcpConfigured = !!(GCP_PROJECT_ID && PUBSUB_TOPIC && GCS_SERVICE_ACCOUNT_KEY);
  }

  // If GCP is not configured, throw a helpful error
  if (!isGcpConfigured) {
    throw new Error(
      'GCP is not configured. GCP_PROJECT_ID, PUBSUB_TOPIC, and GCS_SERVICE_ACCOUNT_KEY environment variables are required for test automation features. ' +
      'If you are not using test automation, you can ignore this error or remove the test automation routes.'
    );
  }

  // Initialize Pub/Sub client if not already initialized
  if (!pubsub) {
    const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID!;
    const GCS_SERVICE_ACCOUNT_KEY = process.env.GCS_SERVICE_ACCOUNT_KEY!;
    
let credentials;
try {
      credentials = JSON.parse(GCS_SERVICE_ACCOUNT_KEY);
} catch (error) {
  console.error('Error parsing GCS_SERVICE_ACCOUNT_KEY:', error);
  throw new Error('Invalid GCS_SERVICE_ACCOUNT_KEY format');
}

    pubsub = new PubSub({
      projectId: GCP_PROJECT_ID,
  credentials: credentials
});
  }

  return pubsub;
}

/**
 * Publishes a test execution request to Pub/Sub
 * @param testData Test data to be sent to the Cloud Run service
 * @returns Message ID from Pub/Sub
 */
export async function publishTestExecutionRequest(testData: any): Promise<string> {
  try {
    const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID;
    const PUBSUB_TOPIC = process.env.PUBSUB_TOPIC;
    
    if (!GCP_PROJECT_ID || !PUBSUB_TOPIC) {
      throw new Error('GCP_PROJECT_ID and PUBSUB_TOPIC environment variables are required');
    }

    console.log('Preparing to publish message to Pub/Sub');
    console.log('Using project ID:', GCP_PROJECT_ID);
    console.log('Using topic:', PUBSUB_TOPIC);
    
    const client = getPubSubClient();
    const dataBuffer = Buffer.from(JSON.stringify(testData));
    
    // Publish message to the topic
    const messageId = await client.topic(PUBSUB_TOPIC).publish(dataBuffer);
    console.log(`Message ${messageId} published to ${PUBSUB_TOPIC}`);
    
    return messageId;
  } catch (error) {
    console.error('Error publishing to Pub/Sub:', error);
    throw error;
  }
} 