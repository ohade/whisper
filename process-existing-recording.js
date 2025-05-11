const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');

// Get language from command line arguments
const args = process.argv.slice(2);
const languageArg = args.find(arg => arg.startsWith('--lang='));

// Configuration
const API_URL = 'http://localhost:3000/api';
const FILE_PATH = path.join(__dirname, 'uploads', 'recording-1746950992387.webm');

// Validate language parameter
if (!languageArg) {
  console.error('Error: Language parameter is required');
  console.error('Usage: node process-existing-recording.js --lang=hebrew|english');
  process.exit(1);
}

const LANGUAGE = languageArg.split('=')[1].toLowerCase();

// Validate language value
if (LANGUAGE !== 'hebrew' && LANGUAGE !== 'english') {
  console.error('Error: Language must be either "hebrew" or "english"');
  console.error('Usage: node process-existing-recording.js --lang=hebrew|english');
  process.exit(1);
}

async function processExistingRecording() {
  try {
    console.log('Processing existing recording:', FILE_PATH);
    console.log('Language:', LANGUAGE);
    
    // Check if file exists
    if (!fs.existsSync(FILE_PATH)) {
      console.error('File not found:', FILE_PATH);
      return;
    }
    
    // Get file stats
    const stats = fs.statSync(FILE_PATH);
    console.log(`File size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`File absolute path: ${path.resolve(FILE_PATH)}`);
    
    // Verify file format
    console.log(`File extension: ${path.extname(FILE_PATH)}`);
    console.log(`File exists: ${fs.existsSync(FILE_PATH)}`);
    console.log(`File is readable: ${fs.accessSync(FILE_PATH, fs.constants.R_OK) === undefined ? 'Yes' : 'No'}`);
    
    // Check if file is too large for direct upload (25MB limit)
    const MAX_SIZE = 25 * 1024 * 1024; // 25MB in bytes
    if (stats.size > MAX_SIZE) {
      console.log(`Warning: File size (${(stats.size / (1024 * 1024)).toFixed(2)} MB) exceeds OpenAI's 25MB limit.`);
      console.log('The server will split this file at quiet points before transcription.');
    }
    
    // Create form data
    const formData = new FormData();
    formData.append('audio', fs.createReadStream(FILE_PATH));
    formData.append('language', LANGUAGE);
    
    console.log('Sending file to server for transcription...');
    console.log('This may take a while for long recordings...');
    
    // Send to server
    const response = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      let errorText;
      try {
        // Try to parse as JSON
        const errorJson = await response.json();
        errorText = JSON.stringify(errorJson);
        console.error('Server error details:', errorJson);
      } catch (e) {
        // If not JSON, get as text
        errorText = await response.text();
      }
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Transcription completed successfully!');
    console.log('Recording ID:', result.id);
    console.log('Title:', result.title);
    console.log('Language:', result.language);
    console.log('Transcription preview:', result.transcription.substring(0, 200) + '...');
    console.log('\nYou can now view the full transcription in the web application.');
    
  } catch (error) {
    console.error('Error processing recording:', error);
  }
}

// Run the function
processExistingRecording();
