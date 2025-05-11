/**
 * Process Recording Script
 * 
 * This script processes an audio recording file through the full flow:
 * 1. Validates the audio file
 * 2. Transcribes it using OpenAI Whisper API
 * 3. Generates a title using GPT-4o
 * 4. Updates the recordings metadata
 * 
 * Usage: node process-recording.js --lang=hebrew|english --file=/path/to/file.webm
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const { validateAudioFile } = require('./backend/utils/webm-validator');
const { transcribeWithWhisper } = require('./backend/utils/whisper-transcription');

// Get command line arguments
const args = process.argv.slice(2);
const languageArg = args.find(arg => arg.startsWith('--lang='));
const fileArg = args.find(arg => arg.startsWith('--file='));

// Validate arguments
if (!languageArg || !fileArg) {
  console.error('Error: Language and file parameters are required');
  console.error('Usage: node process-recording.js --lang=hebrew|english --file=/path/to/file.webm');
  process.exit(1);
}

const LANGUAGE = languageArg.split('=')[1].toLowerCase();
const FILE_PATH = fileArg.split('=')[1];

// Validate language
if (LANGUAGE !== 'hebrew' && LANGUAGE !== 'english') {
  console.error('Error: Language must be either "hebrew" or "english"');
  console.error('Usage: node process-recording.js --lang=hebrew|english --file=/path/to/file.webm');
  process.exit(1);
}

// Check if file exists
if (!fs.existsSync(FILE_PATH)) {
  console.error(`File not found: ${FILE_PATH}`);
  process.exit(1);
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Path to recordings directory and metadata file
const recordingsDir = path.join(__dirname, 'recordings');
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true });
}

// Helper functions for metadata handling (copied from server.js)
const getRecordingsMetadata = () => {
  const metadataPath = path.join(recordingsDir, 'metadata.json');
  if (fs.existsSync(metadataPath)) {
    return JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  }
  return [];
};

const saveRecordingMetadata = (metadata) => {
  const metadataPath = path.join(recordingsDir, 'metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
};

/**
 * Main function to process a recording through the full flow
 */
async function processRecording() {
  try {
    console.log(`Processing file: ${FILE_PATH}`);
    console.log(`File size: ${fs.statSync(FILE_PATH).size} bytes`);
    console.log(`Language: ${LANGUAGE}`);

    // Step 1: Validate the audio file
    console.log('Validating audio file...');
    const validationResult = await validateAudioFile(FILE_PATH);
    
    if (!validationResult.isValid) {
      console.error('Audio file validation failed:', validationResult.details);
      process.exit(1);
    }
    
    console.log('Audio file validation successful:', validationResult.details);

    // Step 2: Transcribe with Whisper
    console.log('Transcribing audio with Whisper...');
    let transcription;
    try {
      transcription = await transcribeWithWhisper(openai, FILE_PATH, LANGUAGE, true);
      console.log('Transcription successful');
      console.log('Transcription preview:', transcription.substring(0, 100) + '...');
    } catch (whisperError) {
      console.error('Whisper API error:', whisperError);
      process.exit(1);
    }

    // Step 3: Generate title using GPT-4o
    console.log('Generating title with GPT-4o...');
    const titleResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Generate a short, concise title (3-5 words) that captures the essence of the following ${LANGUAGE} text. Return only the title, nothing else.`
        },
        {
          role: "user",
          content: transcription
        }
      ],
      max_tokens: 20
    });

    const title = titleResponse.choices[0].message.content.trim();
    console.log('Generated title:', title);

    // Step 4: Update recordings metadata
    console.log('Updating recordings metadata...');
    const recordings = getRecordingsMetadata();
    const timestamp = new Date().toISOString();
    
    const newRecording = {
      id: Date.now().toString(),
      title,
      timestamp,
      language: LANGUAGE,
      audioPath: FILE_PATH,
      transcription,
      tags: [] // Initialize with empty tags array
    };
    
    recordings.push(newRecording);
    saveRecordingMetadata(recordings);
    
    console.log('Recording processed successfully!');
    console.log('Recording ID:', newRecording.id);
    console.log('Title:', newRecording.title);
    console.log('Timestamp:', newRecording.timestamp);
    console.log('The recording will now appear in the app.');
    
  } catch (error) {
    console.error('Error processing recording:', error);
    process.exit(1);
  }
}

// Run the main function
processRecording();
