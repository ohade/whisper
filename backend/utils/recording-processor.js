/**
 * Recording Processor Module
 * 
 * This module encapsulates the core logic for processing audio recordings:
 * 1. Validating the audio file
 * 2. Transcribing it using OpenAI Whisper API
 * 3. Generating a title using GPT-4o
 * 4. Managing recording metadata
 */

const fs = require('fs');
const path = require('path');
const { validateAudioFile } = require('./webm-validator');
const { transcribeWithWhisper } = require('./whisper-transcription');

// Path to recordings directory and metadata file
const recordingsDir = path.join(process.cwd(), 'recordings');

/**
 * Get recordings metadata from the metadata.json file
 * @returns {Array} Array of recording metadata objects
 */
const getRecordingsMetadata = () => {
  const metadataPath = path.join(recordingsDir, 'metadata.json');
  if (fs.existsSync(metadataPath)) {
    return JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  }
  return [];
};

/**
 * Save recordings metadata to the metadata.json file
 * @param {Array} metadata Array of recording metadata objects
 */
const saveRecordingMetadata = (metadata) => {
  const metadataPath = path.join(recordingsDir, 'metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
};

/**
 * Process an audio recording through the full flow
 * 
 * @param {Object} openai - OpenAI API client
 * @param {string} filePath - Path to the audio file
 * @param {string} language - Language ('hebrew' or 'english')
 * @returns {Promise<Object>} The new recording metadata object
 */
async function processRecording(openai, filePath, language) {
  console.log(`Processing file: ${filePath}`);
  console.log(`File size: ${fs.statSync(filePath).size} bytes`);
  console.log(`Language: ${language}`);

  // Ensure recordings directory exists
  if (!fs.existsSync(recordingsDir)) {
    fs.mkdirSync(recordingsDir, { recursive: true });
  }

  // Create temp directory for split files if it doesn't exist
  const tempDir = path.join(path.dirname(filePath), 'temp_splits');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // Step 1: Validate the audio file
  console.log('Validating audio file...');
  const validationResult = await validateAudioFile(filePath);
  
  if (!validationResult.isValid) {
    console.error('Audio file validation failed:', validationResult.details);
    throw new Error(`Invalid audio file: ${validationResult.details}`);
  }
  
  console.log('Audio file validation successful:', validationResult.details);

  // Step 2: Transcribe with Whisper
  console.log('Transcribing audio with Whisper...');
  let transcription;
  try {
    transcription = await transcribeWithWhisper(openai, filePath, language, true);
    console.log('Transcription successful');
    console.log('Transcription preview:', transcription.substring(0, 100) + '...');
  } catch (whisperError) {
    console.error('Whisper API error:', whisperError);
    throw whisperError;
  }

  // Step 3: Generate title using GPT-4o
  console.log('Generating title with GPT-4o...');
  const titleResponse = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `Generate a short, concise title (3-5 words) that captures the essence of the following ${language} text. Return only the title, nothing else.`
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
    language,
    audioPath: filePath,
    transcription,
    tags: [], // Initialize with empty tags array
    meetingSummary: null // Initialize with null meeting summary
  };
  
  recordings.push(newRecording);
  saveRecordingMetadata(recordings);
  
  console.log('Recording processed successfully!');
  console.log('Recording ID:', newRecording.id);
  
  return newRecording;
}

module.exports = {
  processRecording,
  getRecordingsMetadata,
  saveRecordingMetadata
};
