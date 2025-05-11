/**
 * Process Large File Script (V2)
 * 
 * This script processes a large audio file through the full flow using the same
 * code path as the main application.
 * 
 * Usage: node process-large-file-v2.js --lang=hebrew|english --file=/path/to/file.webm
 */

require('dotenv').config();
const { OpenAI } = require('openai');
const { processRecording } = require('./backend/utils/recording-processor');

// Get command line arguments
const args = process.argv.slice(2);
const languageArg = args.find(arg => arg.startsWith('--lang='));
const fileArg = args.find(arg => arg.startsWith('--file='));

// Validate arguments
if (!languageArg || !fileArg) {
  console.error('Error: Language and file parameters are required');
  console.error('Usage: node process-large-file-v2.js --lang=hebrew|english --file=/path/to/file.webm');
  process.exit(1);
}

const LANGUAGE = languageArg.split('=')[1].toLowerCase();
const FILE_PATH = fileArg.split('=')[1];

// Validate language
if (LANGUAGE !== 'hebrew' && LANGUAGE !== 'english') {
  console.error('Error: Language must be either "hebrew" or "english"');
  console.error('Usage: node process-large-file-v2.js --lang=hebrew|english --file=/path/to/file.webm');
  process.exit(1);
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Main function to process a large audio file
 */
async function main() {
  try {
    console.log('Starting large file processing with V2 implementation...');
    console.log('Using the unified recording processor module that handles large files automatically');
    
    // Process the recording using the same code path as the main application
    const recording = await processRecording(openai, FILE_PATH, LANGUAGE);
    
    console.log('\nLarge file processed successfully!');
    console.log('Recording ID:', recording.id);
    console.log('Title:', recording.title);
    console.log('Timestamp:', recording.timestamp);
    console.log('Language:', recording.language);
    console.log('Transcription preview:', recording.transcription.substring(0, 100) + '...');
    console.log('\nThe recording will now appear in the app.');
    
  } catch (error) {
    console.error('Error processing large file:', error);
    process.exit(1);
  }
}

// Run the main function
main();
