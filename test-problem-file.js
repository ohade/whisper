/**
 * Test script for the problematic WebM file
 */

const { validateWebMFile } = require('./backend/utils/webm-validator');

// Path to the problematic file
const problemFilePath = '/Users/ohadedelstein/projects/playground/whisper/uploads/recording-1746961155573.webm';

async function testProblemFile() {
  console.log(`Testing problematic file: ${problemFilePath}`);
  
  try {
    const result = await validateWebMFile(problemFilePath);
    console.log('Validation result:', result);
    
    if (!result.isValid) {
      console.log('\nRecommendation:');
      console.log('1. The file has an invalid WebM header and is corrupted.');
      console.log('2. Request a new recording as this file cannot be processed.');
      console.log('3. If this is happening frequently, check the recording setup and software.');
    }
  } catch (error) {
    console.error('Error during validation:', error);
  }
}

// Run the test
testProblemFile();
