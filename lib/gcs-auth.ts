// Google Cloud Storage authentication and utils

/**
 * Helper function to convert a standard GCS URL to a signed URL that can be accessed directly
 * Uses the API endpoint to generate a signed URL with proper authentication
 * 
 * @param url The Google Cloud Storage URL
 * @returns A signed URL that can be used to access the file
 */
export async function getSignedUrl(url: string): Promise<string> {
  try {
    // Only process Google Cloud Storage URLs
    if (!url.includes('storage.cloud.google.com') && !url.includes('storage.googleapis.com')) {
      return url;
    }
    
    console.log(`Generating signed URL for: ${url}`);
    
    // Call our API endpoint to get a signed URL
    const response = await fetch('/api/gcs-auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to generate signed URL: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.signedUrl) {
      console.log(`Successfully generated signed URL`);
      return data.signedUrl;
    }
    
    throw new Error('No signed URL returned from API');
  } catch (error) {
    console.error('Error generating signed URL:', error);
    // Return the original URL if we couldn't generate a signed URL
    return url;
  }
}

/**
 * Get a list of video files from a Google Cloud Storage folder
 * Uses the API endpoint to list files with proper authentication
 * 
 * @param folderUrl The URL to a GCS folder
 * @returns An array of file URLs in the folder
 */
export async function listFilesInFolder(folderUrl: string): Promise<string[]> {
  try {
    // Only process Google Cloud Storage URLs
    if (!folderUrl.includes('storage.cloud.google.com') && !folderUrl.includes('storage.googleapis.com')) {
      return [folderUrl];
    }
    
    console.log(`Listing files in folder: ${folderUrl}`);
    
    // Call our API endpoint to list files
    const response = await fetch(`/api/gcs-auth?folderUrl=${encodeURIComponent(folderUrl)}`);
    
    if (!response.ok) {
      throw new Error(`Failed to list files: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.files && Array.isArray(data.files) && data.files.length > 0) {
      console.log(`Found ${data.files.length} files in folder`);
      return data.files;
    }
    
    console.warn('No files found in folder, returning folder URL as fallback');
    return [folderUrl];
  } catch (error) {
    console.error('Error listing files in folder:', error);
    // Return the folder URL as a fallback
    return [folderUrl];
  }
}

/**
 * Check if a URL is from Google Cloud Storage
 */
export function isGcsUrl(url: string): boolean {
  return url.includes('storage.cloud.google.com') || url.includes('storage.googleapis.com');
}

/**
 * Parse a Google Cloud Storage URL to get the bucket and path
 */
export function parseGcsUrl(url: string): { bucket: string; path: string } | null {
  try {
    let bucket = '';
    let path = '';
    
    if (url.includes('storage.cloud.google.com')) {
      const urlParts = url.replace('https://storage.cloud.google.com/', '').split('/');
      bucket = urlParts[0];
      path = urlParts.slice(1).join('/');
    } else if (url.includes('storage.googleapis.com')) {
      const urlParts = url.replace('https://storage.googleapis.com/', '').split('/');
      bucket = urlParts[0];
      path = urlParts.slice(1).join('/');
    } else {
      return null;
    }
    
    return { bucket, path };
  } catch (error) {
    console.error('Error parsing GCS URL:', error);
    return null;
  }
}

// This will be implemented once we have the service account key
export async function initGoogleCloudStorage(serviceAccountKey: string) {
  // In production, you would use the Google Cloud Storage client library
  // to initialize the storage client with the service account key
  console.log('Would initialize Google Cloud Storage with service account key');
} 