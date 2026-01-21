const fs = require('fs');
const path = require('path');

// Path to the service account key file
const keyPath = '/Users/atriroy/Documents/gcs_key/gen-lang-client-0970786227-25f10d31c495.json';

try {
  // Check if the file exists
  if (!fs.existsSync(keyPath)) {
    console.error(`File does not exist: ${keyPath}`);
    process.exit(1);
  }
  
  // Read the file
  const fileContents = fs.readFileSync(keyPath, 'utf8');
  console.log(`Read ${fileContents.length} bytes from file`);
  
  // Try to parse as JSON
  try {
    const keyJson = JSON.parse(fileContents);
    
    // Check for required fields
    const requiredFields = ['client_email', 'private_key', 'project_id'];
    const missingFields = requiredFields.filter(field => !keyJson[field]);
    
    if (missingFields.length > 0) {
      console.error(`JSON is missing required fields: ${missingFields.join(', ')}`);
      console.log('Available fields:', Object.keys(keyJson).join(', '));
    } else {
      console.log('JSON file is valid with all required fields');
      console.log('client_email:', keyJson.client_email);
      console.log('project_id:', keyJson.project_id);
      console.log('private_key length:', keyJson.private_key.length);
    }
  } catch (jsonError) {
    console.error('Failed to parse file as JSON:', jsonError);
    console.log('First 100 characters of file:', fileContents.substring(0, 100));
  }
} catch (error) {
  console.error('Error reading or processing file:', error);
} 