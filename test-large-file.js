const fs = require('fs');
const path = require('path');
const { transcribeWithWhisper } = require('./backend/utils/whisper-transcription');
const OpenAI = require('openai');
require('dotenv').config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Path to a large audio file (>25MB) for testing
const TEST_FILE = '/Users/ohadedelstein/projects/playground/whisper/uploads/recording-1746955916051.webm'; // 34MB file

async function testLargeFileTranscription() {
  console.log('Starting large file transcription test...');
  console.log(`Testing file: ${TEST_FILE} (${(fs.statSync(TEST_FILE).size / (1024 * 1024)).toFixed(2)}MB)`);
  
  try {
    // Set language to English for testing
    const language = 'en';
    
    console.log('Beginning transcription process...');
    const result = await transcribeWithWhisper(openai, TEST_FILE, language);
    
    console.log('\n=== Transcription Result ===');
    console.log(result);
    console.log('=== End of Result ===\n');
    
    console.log('Test completed successfully!');
    return result;
  } catch (error) {
    console.error('Error during transcription test:', error);
    throw error;
  }
}

// Run the test
testLargeFileTranscription()
  .then(() => {
    console.log('Large file handling test completed successfully.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
  });
