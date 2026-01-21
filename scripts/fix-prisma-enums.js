// This script checks and updates the Prisma client RunStatus enum
const fs = require('fs');
const path = require('path');

// Path to the Prisma client index.js file where enums are defined
const prismaClientPath = path.join(__dirname, '../node_modules/@prisma/client/index.js');

// Function to check if the file exists
if (!fs.existsSync(prismaClientPath)) {
  console.error('Prisma client index.js not found at:', prismaClientPath);
  process.exit(1);
}

// Read the file content
let fileContent = fs.readFileSync(prismaClientPath, 'utf8');

// Check if RunStatus enum exists in the file
if (fileContent.includes('RunStatus')) {
  console.log('RunStatus enum found in Prisma client.');
  
  // Check if ABORTED is already in the RunStatus enum
  if (fileContent.includes('ABORTED: "ABORTED"')) {
    console.log('ABORTED status already exists in RunStatus enum.');
  } else {
    console.log('ABORTED status not found in RunStatus enum. Adding it...');
    
    // Add ABORTED to the RunStatus enum
    fileContent = fileContent.replace(
      /RunStatus:\s*\{\s*PENDING:\s*"PENDING",\s*RUNNING:\s*"RUNNING",\s*COMPLETED:\s*"COMPLETED",\s*FAILED:\s*"FAILED"\s*\}/g,
      'RunStatus: { PENDING: "PENDING", RUNNING: "RUNNING", COMPLETED: "COMPLETED", FAILED: "FAILED", ABORTED: "ABORTED" }'
    );
    
    // Write the updated content back to the file
    fs.writeFileSync(prismaClientPath, fileContent, 'utf8');
    console.log('ABORTED status added to RunStatus enum successfully!');
  }
} else {
  console.error('RunStatus enum not found in Prisma client.');
  process.exit(1);
}

// Also check index.d.ts for TypeScript definitions
const prismaClientTypesPath = path.join(__dirname, '../node_modules/@prisma/client/index.d.ts');

if (fs.existsSync(prismaClientTypesPath)) {
  console.log('Checking TypeScript definitions...');
  
  let typesContent = fs.readFileSync(prismaClientTypesPath, 'utf8');
  
  // Check if ABORTED is already in the RunStatus enum type definition
  if (typesContent.includes('ABORTED')) {
    console.log('ABORTED status already exists in RunStatus TypeScript definition.');
  } else {
    console.log('ABORTED status not found in RunStatus TypeScript definition. Adding it...');
    
    // Add ABORTED to the RunStatus enum type definition
    typesContent = typesContent.replace(
      /export const RunStatus: \{\s*PENDING: 'PENDING',\s*RUNNING: 'RUNNING',\s*COMPLETED: 'COMPLETED',\s*FAILED: 'FAILED'\s*\}/g,
      "export const RunStatus: { PENDING: 'PENDING', RUNNING: 'RUNNING', COMPLETED: 'COMPLETED', FAILED: 'FAILED', ABORTED: 'ABORTED' }"
    );
    
    typesContent = typesContent.replace(
      /export type RunStatus = \(\s*typeof RunStatus\s*\)\[keyof typeof RunStatus\]/g,
      "export type RunStatus = (typeof RunStatus)[keyof typeof RunStatus]"
    );
    
    // Write the updated content back to the file
    fs.writeFileSync(prismaClientTypesPath, typesContent, 'utf8');
    console.log('ABORTED status added to RunStatus TypeScript definition successfully!');
  }
} else {
  console.log('TypeScript definitions file not found at:', prismaClientTypesPath);
}

console.log('RunStatus enum update completed. Please restart your application for changes to take effect.'); 