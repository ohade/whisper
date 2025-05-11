/**
 * Large File Handler for OpenAI Whisper API
 * 
 * This module provides a direct approach to handle large audio files that exceed
 * OpenAI's 25MB limit by converting and splitting them into smaller chunks.
 */

const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { validateAudioFile } = require('./webm-validator');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

// Maximum file size for OpenAI Whisper API (in bytes)
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

/**
 * Process a large audio file for OpenAI Whisper API
 * 
 * @param {string} inputFile - Path to the input audio file
 * @returns {Promise<string[]>} - Array of paths to processed audio files ready for transcription
 */
async function processLargeAudioFile(inputFile) {
  console.log(`Processing large audio file: ${inputFile}`);
  
  // Check if file exists
  if (!fs.existsSync(inputFile)) {
    throw new Error(`Input file not found: ${inputFile}`);
  }
  
  // Get file stats
  const stats = fs.statSync(inputFile);
  console.log(`Original file size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
  
  // Validate the audio file before processing
  const fileExt = path.extname(inputFile).toLowerCase();
  if (fileExt === '.webm') {
    console.log('Validating WebM file before processing...');
    const validationResult = await validateAudioFile(inputFile);
    
    if (!validationResult.isValid) {
      throw new Error(`Invalid WebM file: ${validationResult.details}`);
    }
    
    console.log('WebM validation passed:', validationResult.details);
  }
  
  // If file is already under the size limit, return it as is
  if (stats.size <= MAX_FILE_SIZE) {
    console.log('File is already under size limit, no need to process');
    return [inputFile];
  }
  
  // Create temp directory for processed files
  const tempDir = path.join(path.dirname(inputFile), 'temp_splits');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // First, convert to a more efficient format (mp3) to reduce file size
  const convertedFile = await convertToMP3(inputFile, tempDir);
  console.log(`Converted file: ${convertedFile}`);
  
  // Get converted file stats
  const convertedStats = fs.statSync(convertedFile);
  console.log(`Converted file size: ${(convertedStats.size / (1024 * 1024)).toFixed(2)} MB`);
  
  // If converted file is under the size limit, return it
  if (convertedStats.size <= MAX_FILE_SIZE) {
    console.log('Converted file is under size limit, no need to split');
    return [convertedFile];
  }
  
  // Split the converted file into chunks
  const splitFiles = await splitAudioFile(convertedFile, tempDir);
  console.log(`Split into ${splitFiles.length} files`);
  
  return splitFiles;
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
  
  console.log(`Converting ${inputFile} to MP3 format`);
  
  return new Promise((resolve, reject) => {
    let ffmpegCommand = ffmpeg();
    
    // Check if the file is a webm file
    if (path.extname(inputFile).toLowerCase() === '.webm') {
      console.log('Detected WebM file, using special handling...');
      // Add input options to better handle potentially problematic webm files
      ffmpegCommand = ffmpegCommand
        .input(inputFile)
        .inputOptions([
          '-ignore_unknown', // Ignore unknown streams
          '-analyzeduration 100M', // Increase analysis time
          '-probesize 100M' // Increase probe size
        ]);
    } else {
      ffmpegCommand = ffmpegCommand.input(inputFile);
    }
    
    ffmpegCommand
      .output(outputFile)
      .audioCodec('libmp3lame')
      .audioBitrate('64k') // Lower bitrate for smaller file size
      .audioChannels(1) // Mono audio
      .audioFrequency(16000) // 16kHz sample rate (good for speech)
      .outputOptions([
        '-af aresample=async=1' // Handle asynchronous audio streams
      ])
      .on('end', () => {
        console.log(`Conversion to MP3 complete: ${outputFile}`);
        resolve(outputFile);
      })
      .on('error', (err) => {
        console.error(`Error converting to MP3: ${err.message}`);
        reject(err);
      })
      .run();
  });
}

/**
 * Split audio file into chunks of appropriate size
 * 
 * @param {string} inputFile - Path to the input audio file
 * @param {string} outputDir - Directory to save the split files
 * @returns {Promise<string[]>} - Array of paths to the split audio files
 */
async function splitAudioFile(inputFile, outputDir) {
  console.log(`Splitting audio file: ${inputFile}`);
  
  // Get audio duration
  const metadata = await getAudioMetadata(inputFile);
  const duration = metadata.format.duration;
  const fileSize = fs.statSync(inputFile).size;
  
  console.log(`Audio duration: ${duration.toFixed(2)} seconds`);
  console.log(`File size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`);
  
  // Calculate optimal segment duration (in seconds)
  // Use 80% of max size to be safe
  const bytesPerSecond = fileSize / duration;
  const segmentDuration = Math.floor((MAX_FILE_SIZE * 0.8) / bytesPerSecond);
  
  console.log(`Bytes per second: ${(bytesPerSecond / 1024).toFixed(2)} KB/s`);
  console.log(`Segment duration: ${segmentDuration} seconds`);
  
  // Calculate number of segments
  const numSegments = Math.ceil(duration / segmentDuration);
  console.log(`Number of segments: ${numSegments}`);
  
  // Split the file using ffmpeg segment feature
  const fileName = path.basename(inputFile, path.extname(inputFile));
  const outputPattern = path.join(outputDir, `${fileName}_part%03d.mp3`);
  
  return new Promise((resolve, reject) => {
    ffmpeg(inputFile)
      .outputOptions([
        `-f segment`,
        `-segment_time ${segmentDuration}`,
        `-reset_timestamps 1`,
        `-map 0:a`, // Map only audio stream
        `-c:a libmp3lame`,
        `-b:a 64k`, // Consistent bitrate for all segments
        `-ac 1`, // Mono
        `-ar 16000` // 16kHz sample rate
      ])
      .output(outputPattern)
      .on('end', () => {
        // Get all created files
        const files = fs.readdirSync(outputDir)
          .filter(file => file.startsWith(`${fileName}_part`) && file.endsWith('.mp3'))
          .map(file => path.join(outputDir, file))
          .sort(); // Ensure correct order
        
        console.log(`Created ${files.length} segments`);
        
        // Verify each file size
        files.forEach(file => {
          const size = fs.statSync(file).size;
          console.log(`Segment ${path.basename(file)}: ${(size / (1024 * 1024)).toFixed(2)} MB`);
          
          if (size > MAX_FILE_SIZE) {
            console.warn(`Warning: Segment ${path.basename(file)} exceeds size limit!`);
          }
        });
        
        resolve(files);
      })
      .on('error', (err) => {
        console.error(`Error splitting file: ${err.message}`);
        reject(err);
      })
      .run();
  });
}

/**
 * Get audio file metadata using ffprobe
 * 
 * @param {string} filePath - Path to the audio file
 * @returns {Promise<Object>} - Audio metadata
 */
function getAudioMetadata(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(metadata);
    });
  });
}

/**
 * Clean up temporary files
 * 
 * @param {string[]} filePaths - Array of file paths to clean up
 * @param {string} originalFile - Original file path to preserve
 */
function cleanupTempFiles(filePaths, originalFile) {
  console.log('Cleaning up temporary files...');
  
  filePaths.forEach(file => {
    if (file !== originalFile && fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`Deleted: ${file}`);
    }
  });
  
  // Try to remove temp directory if empty
  const tempDir = path.dirname(filePaths[0]);
  try {
    const remaining = fs.readdirSync(tempDir);
    if (remaining.length === 0) {
      fs.rmdirSync(tempDir);
      console.log(`Removed empty directory: ${tempDir}`);
    }
  } catch (err) {
    console.error(`Error cleaning up directory: ${err.message}`);
  }
}

module.exports = {
  processLargeAudioFile,
  MAX_FILE_SIZE,
  cleanupTempFiles
};
