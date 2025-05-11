/**
 * Whisper Transcription Service
 * 
 * This module handles transcription of audio files using OpenAI's Whisper API,
 * including handling large files that exceed the 25MB limit.
 */

const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { processLargeAudioFile, MAX_FILE_SIZE, cleanupTempFiles } = require('./large-file-handler');
const { validateAudioFile } = require('./webm-validator');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Transcribe an audio file using OpenAI Whisper API
 * 
 * @param {Object} openai - OpenAI API client
 * @param {string} filePath - Path to the audio file
 * @param {string} language - Language code ('hebrew' or 'english')
 * @param {boolean} cleanup - Whether to clean up temporary files after transcription
 * @returns {Promise<string>} - The transcription text
 */
async function transcribeWithWhisper(openai, filePath, language, cleanup = true) {
  console.log(`Starting transcription process for: ${filePath}`);
  console.log(`Language: ${language}`);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  // Get file stats
  const stats = fs.statSync(filePath);
  console.log(`File size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
  
  // Validate the audio file before processing
  // Note: This is a secondary validation in case it wasn't done at the API level
  const fileExt = path.extname(filePath).toLowerCase();
  if (fileExt === '.webm') {
    console.log('Performing additional WebM file validation...');
    const validationResult = await validateAudioFile(filePath);
    
    if (!validationResult.isValid) {
      throw new Error(`Invalid audio file: ${validationResult.details}`);
    }
    
    console.log('WebM validation passed:', validationResult.details);
  }
  
  let processedFiles = [];
  let transcriptions = [];
  
  try {
    // Create temp directory for processed files
    const tempDir = path.join(path.dirname(filePath), 'temp_splits');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Process file if it's too large
    if (stats.size > MAX_FILE_SIZE) {
      console.log(`File exceeds ${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(2)} MB limit, processing...`);
      
      // First, try to convert to a more efficient format (mp3) to reduce file size
      console.log('Converting to MP3 to reduce file size...');
      const mp3File = await convertToMP3(filePath, tempDir);
      
      // Check if conversion reduced size enough
      const mp3Stats = fs.statSync(mp3File);
      console.log(`Converted file size: ${(mp3Stats.size / (1024 * 1024)).toFixed(2)} MB`);
      
      if (mp3Stats.size <= MAX_FILE_SIZE) {
        console.log('Conversion successful, file now under size limit');
        processedFiles = [mp3File];
      } else {
        // Still too large, use the large file handler to split
        console.log('File still exceeds size limit after conversion, splitting...');
        processedFiles = await processLargeAudioFile(mp3File);
      }
      
      console.log(`Processed into ${processedFiles.length} files`);
    } else {
      // File is under the limit, use as is
      processedFiles = [filePath];
    }
    
    // Transcribe each file
    console.log(`Transcribing ${processedFiles.length} file(s)...`);
    
    for (let i = 0; i < processedFiles.length; i++) {
      const file = processedFiles[i];
      console.log(`Transcribing file ${i+1}/${processedFiles.length}: ${path.basename(file)}`);
      
      // Get file size for verification
      const fileSize = fs.statSync(file).size;
      console.log(`File size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`);
      
      if (fileSize > MAX_FILE_SIZE) {
        console.warn(`Warning: File still exceeds size limit! Attempting transcription anyway...`);
      }
      
      // Create a file stream for the API
      const fileStream = fs.createReadStream(file);
      
      // Call Whisper API
      const result = await openai.audio.transcriptions.create({
        file: fileStream,
        model: "whisper-1",
        language: language === 'hebrew' ? 'he' : 'en',
        response_format: 'text'
      });
      
      console.log(`Transcription successful for part ${i+1}`);
      transcriptions.push(result);
    }
    
    // Combine all transcriptions
    const fullTranscription = transcriptions.join(' ');
    console.log(`Full transcription completed (${fullTranscription.length} characters)`);
    
    // Save full transcription to file for debugging
    const transcriptionFile = path.join(path.dirname(filePath), `transcription-${path.basename(filePath, path.extname(filePath))}.txt`);
    fs.writeFileSync(transcriptionFile, fullTranscription);
    console.log(`Transcription saved to: ${transcriptionFile}`);
    
    // Clean up temporary files if requested
    if (cleanup && processedFiles.length > 1) {
      cleanupTempFiles(processedFiles, filePath);
    }
    
    return fullTranscription;
  } catch (error) {
    console.error('Error in transcription process:', error);
    
    // Clean up on error if requested
    if (cleanup && processedFiles.length > 1) {
      try {
        cleanupTempFiles(processedFiles, filePath);
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }
    }
    
    throw error;
  }
}

/**
 * Convert audio file to MP3 format with optimized settings
 * 
 * @param {string} inputFile - Path to the input audio file
 * @param {string} outputDir - Directory to save the converted file
 * @returns {Promise<string>} - Path to the converted MP3 file
 */
async function convertToMP3(inputFile, outputDir) {
  const fileName = path.basename(inputFile, path.extname(inputFile));
  const outputFile = path.join(outputDir, `${fileName}_converted.mp3`);
  
  console.log(`Converting to MP3 with optimized settings...`);
  
  return new Promise((resolve, reject) => {
    ffmpeg(inputFile)
      .output(outputFile)
      .audioCodec('libmp3lame')
      .audioBitrate('64k') // Lower bitrate for smaller file size
      .audioChannels(1) // Mono audio
      .audioFrequency(16000) // 16kHz sample rate (good for speech)
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`Conversion progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log(`Conversion complete: ${outputFile}`);
        resolve(outputFile);
      })
      .on('error', (err) => {
        console.error(`Error converting file: ${err.message}`);
        reject(err);
      })
      .run();
  });
}

module.exports = {
  transcribeWithWhisper,
  MAX_FILE_SIZE
};
