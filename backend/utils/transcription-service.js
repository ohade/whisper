/**
 * Transcription Service
 * 
 * This module handles the transcription of audio files, including splitting large files
 * and combining transcriptions from multiple chunks.
 */

const fs = require('fs');
const path = require('path');
const { splitAudioAtQuietPoints, MAX_FILE_SIZE } = require('./audio-splitter');

/**
 * Transcribe an audio file, splitting it if necessary
 * 
 * @param {Object} openai - OpenAI API client
 * @param {string} filePath - Path to the audio file
 * @param {string} language - Language code ('hebrew' or 'english')
 * @returns {Promise<string>} - The combined transcription text
 */
async function transcribeAudio(openai, filePath, language) {
  // Get file stats
  const stats = fs.statSync(filePath);
  
  // If file is under the size limit, transcribe directly
  if (stats.size <= MAX_FILE_SIZE) {
    console.log('File is under size limit, transcribing directly');
    return transcribeSingleFile(openai, filePath, language);
  }
  
  // File is too large, split it at quiet points
  console.log(`File is too large (${(stats.size / (1024 * 1024)).toFixed(2)} MB), splitting at quiet points`);
  
  // Create temporary directory for split files
  const tempDir = path.join(path.dirname(filePath), 'temp_splits');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  try {
    // Split the audio file
    const splitFiles = await splitAudioAtQuietPoints(filePath, tempDir);
    console.log(`Split into ${splitFiles.length} files at quiet points`);
    
    // Transcribe each split file
    const transcriptionPromises = splitFiles.map(splitFile => 
      transcribeSingleFile(openai, splitFile, language)
    );
    
    // Wait for all transcriptions to complete
    const transcriptions = await Promise.all(transcriptionPromises);
    
    // Combine transcriptions
    const combinedTranscription = transcriptions.join(' ');
    
    // Clean up temporary files if they're not the original file
    for (const splitFile of splitFiles) {
      if (splitFile !== filePath && fs.existsSync(splitFile)) {
        fs.unlinkSync(splitFile);
      }
    }
    
    return combinedTranscription;
  } catch (error) {
    console.error('Error in transcription process:', error);
    throw error;
  } finally {
    // Clean up temp directory if it's empty
    try {
      const tempFiles = fs.readdirSync(tempDir);
      if (tempFiles.length === 0) {
        fs.rmdirSync(tempDir);
      }
    } catch (e) {
      console.error('Error cleaning up temp directory:', e);
    }
  }
}

/**
 * Transcribe a single audio file using OpenAI Whisper
 * 
 * @param {Object} openai - OpenAI API client
 * @param {string} filePath - Path to the audio file
 * @param {string} language - Language code ('hebrew' or 'english')
 * @returns {Promise<string>} - The transcription text
 */
async function transcribeSingleFile(openai, filePath, language) {
  console.log(`Transcribing file: ${filePath}`);
  
  try {
    // Check if file exists and get its size
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const stats = fs.statSync(filePath);
    console.log(`File size before transcription: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
    
    // Ensure file is under the size limit
    if (stats.size > MAX_FILE_SIZE) {
      throw new Error(`File is still too large for transcription: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
    }
    
    // Create a file handle that will be properly closed
    const fileStream = fs.createReadStream(filePath);
    
    const transcription = await openai.audio.transcriptions.create({
      file: fileStream,
      model: "whisper-1",
      language: language === 'hebrew' ? 'he' : 'en',
      response_format: 'text'
    });
    
    console.log(`Transcription successful for ${path.basename(filePath)}`);
    return transcription;
  } catch (error) {
    console.error(`Error transcribing file ${filePath}:`, error);
    throw error;
  }
}

module.exports = {
  transcribeAudio
};
