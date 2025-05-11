/**
 * Process Large Audio File for OpenAI Whisper API
 * 
 * This script directly processes a large audio file, converts it to a more efficient format,
 * splits it if necessary, and transcribes each part using OpenAI's Whisper API.
 */

const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { OpenAI } = require('openai');
require('dotenv').config();

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

// Get command line arguments
const args = process.argv.slice(2);
const languageArg = args.find(arg => arg.startsWith('--lang='));
const fileArg = args.find(arg => arg.startsWith('--file='));

// Validate arguments
if (!languageArg || !fileArg) {
  console.error('Error: Language and file parameters are required');
  console.error('Usage: node process-large-file.js --lang=hebrew|english --file=/path/to/file.webm');
  process.exit(1);
}

const LANGUAGE = languageArg.split('=')[1].toLowerCase();
const FILE_PATH = fileArg.split('=')[1];

// Validate language
if (LANGUAGE !== 'hebrew' && LANGUAGE !== 'english') {
  console.error('Error: Language must be either "hebrew" or "english"');
  console.error('Usage: node process-large-file.js --lang=hebrew|english --file=/path/to/file.webm');
  process.exit(1);
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Maximum file size for OpenAI Whisper API (in bytes)
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

/**
 * Main function to process and transcribe a large audio file
 */
async function processLargeFile() {
  try {
    console.log(`Processing file: ${FILE_PATH}`);
    console.log(`Language: ${LANGUAGE}`);
    
    // Check if file exists
    if (!fs.existsSync(FILE_PATH)) {
      console.error(`File not found: ${FILE_PATH}`);
      process.exit(1);
    }
    
    // Get file stats
    const stats = fs.statSync(FILE_PATH);
    console.log(`Original file size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
    
    // Create temp directory
    const tempDir = path.join(path.dirname(FILE_PATH), 'temp_splits');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    let filesToTranscribe = [];
    let conversionSuccessful = true;
    let mp3File;
    
    // Try to convert to MP3 with optimized settings
    try {
      mp3File = await convertToMP3(FILE_PATH, tempDir);
      console.log(`Converted to MP3: ${mp3File}`);
      
      // Get MP3 file stats
      const mp3Stats = fs.statSync(mp3File);
      console.log(`MP3 file size: ${(mp3Stats.size / (1024 * 1024)).toFixed(2)} MB`);
      
      // Split if still too large
      if (mp3Stats.size > MAX_FILE_SIZE) {
        console.log('MP3 file still exceeds size limit, splitting...');
        filesToTranscribe = await splitAudioFile(mp3File, tempDir);
      } else {
        filesToTranscribe = [mp3File];
      }
    } catch (conversionError) {
      console.warn(`Warning: MP3 conversion failed: ${conversionError.message}`);
      console.log('Falling back to direct WebM handling...');
      conversionSuccessful = false;
      
      // If the original file is already under the size limit, use it directly
      if (stats.size <= MAX_FILE_SIZE) {
        console.log('Original file is under size limit, using it directly');
        filesToTranscribe = [FILE_PATH];
      } else {
        // Try to split the original file directly
        console.log('Original file exceeds size limit, attempting direct splitting...');
        try {
          // Calculate optimal segment duration (in seconds)
          const fileExt = path.extname(FILE_PATH);
          const fileName = path.basename(FILE_PATH, fileExt);
          const segmentDuration = Math.floor((MAX_FILE_SIZE * 0.8) / (stats.size / 60)); // Rough estimate
          
          console.log(`Estimated segment duration: ${segmentDuration} seconds`);
          
          // Create copies of the original file in smaller segments
          const outputPattern = path.join(tempDir, `${fileName}_part%03d${fileExt}`);
          
          // Use a simpler ffmpeg command that just copies the streams without re-encoding
          await new Promise((resolve, reject) => {
            ffmpeg(FILE_PATH)
              .outputOptions([
                `-f segment`,
                `-segment_time ${segmentDuration}`,
                `-reset_timestamps 1`,
                `-c copy` // Just copy, don't transcode
              ])
              .output(outputPattern)
              .on('end', () => {
                console.log('Splitting complete');
                resolve();
              })
              .on('error', (err) => {
                console.error(`Error splitting file: ${err.message}`);
                reject(err);
              })
              .run();
          });
          
          // Get all created files
          filesToTranscribe = fs.readdirSync(tempDir)
            .filter(file => file.startsWith(`${fileName}_part`) && file.endsWith(fileExt))
            .map(file => path.join(tempDir, file))
            .sort(); // Ensure correct order
          
          console.log(`Created ${filesToTranscribe.length} segments`);
          
        } catch (splitError) {
          console.error(`Error splitting original file: ${splitError.message}`);
          console.log('Using original file as fallback, may exceed API limits');
          filesToTranscribe = [FILE_PATH];
        }
      }
    }
    
    console.log(`Will transcribe ${filesToTranscribe.length} file(s)`);
    
    // Transcribe each file
    const transcriptions = [];
    
    for (let i = 0; i < filesToTranscribe.length; i++) {
      const file = filesToTranscribe[i];
      console.log(`Transcribing part ${i+1}/${filesToTranscribe.length}: ${path.basename(file)}`);
      
      // Get file size
      const fileSize = fs.statSync(file).size;
      console.log(`File size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`);
      
      // Create file stream
      const fileStream = fs.createReadStream(file);
      
      try {
        // Call Whisper API
        const result = await openai.audio.transcriptions.create({
          file: fileStream,
          model: "whisper-1",
          language: LANGUAGE === 'hebrew' ? 'he' : 'en',
          response_format: 'text'
        });
        
        console.log(`Transcription successful for part ${i+1}`);
        console.log(`Transcription preview: ${result.substring(0, 100)}...`);
        
        transcriptions.push(result);
      } catch (error) {
        console.error(`Error transcribing part ${i+1}:`, error);
        throw error;
      }
    }
    
    // Combine all transcriptions
    const fullTranscription = transcriptions.join(' ');
    console.log('\nFull Transcription:');
    console.log('==================');
    console.log(fullTranscription);
    console.log('==================');
    
    // Save transcription to file
    const transcriptionFile = path.join(path.dirname(FILE_PATH), `transcription-${path.basename(FILE_PATH, path.extname(FILE_PATH))}.txt`);
    fs.writeFileSync(transcriptionFile, fullTranscription);
    console.log(`Transcription saved to: ${transcriptionFile}`);
    
    // Clean up temporary files
    console.log('Cleaning up temporary files...');
    filesToTranscribe.forEach(file => {
      // Never delete the original file
      if (file !== FILE_PATH) {
        try {
          fs.unlinkSync(file);
          console.log(`Deleted temporary file: ${file}`);
        } catch (error) {
          console.error(`Error deleting temporary file ${file}: ${error.message}`);
        }
      }
    });
    
    // Try to remove temp directory if empty
    try {
      const remainingFiles = fs.readdirSync(tempDir);
      if (remainingFiles.length === 0) {
        fs.rmdirSync(tempDir);
        console.log(`Removed empty directory: ${tempDir}`);
      }
    } catch (error) {
      console.error(`Error cleaning up temp directory: ${error.message}`);
    }
    
  } catch (error) {
    console.error('Error processing file:', error);
  }
}

/**
 * Convert audio file to MP3 format with optimized settings
 */
async function convertToMP3(inputFile, outputDir) {
  const fileName = path.basename(inputFile, path.extname(inputFile));
  const outputFile = path.join(outputDir, `${fileName}_converted.mp3`);
  
  console.log(`Converting to MP3 with optimized settings...`);
  
  // For WebM files, try multiple approaches in sequence
  if (path.extname(inputFile).toLowerCase() === '.webm') {
    console.log('Detected WebM file, using multi-stage approach...');
    
    // First, try to extract just the audio stream to WAV (most compatible)
    const tempWavFile = path.join(outputDir, `${fileName}_temp.wav`);
    
    try {
      // Stage 1: Extract audio to WAV
      console.log('Stage 1: Extracting audio to WAV format...');
      await new Promise((resolve, reject) => {
        ffmpeg()
          .input(inputFile)
          .inputOptions([
            '-ignore_unknown',
            '-analyzeduration 100M',
            '-probesize 100M'
          ])
          .outputOptions([
            '-vn', // No video
            '-acodec pcm_s16le', // PCM audio (very compatible)
            '-ar 16000', // 16kHz sample rate
            '-ac 1' // Mono
          ])
          .output(tempWavFile)
          .on('end', () => {
            console.log(`WAV extraction complete: ${tempWavFile}`);
            resolve();
          })
          .on('error', (err) => {
            console.error(`Error extracting WAV: ${err.message}`);
            reject(err);
          })
          .run();
      });
      
      // Stage 2: Convert WAV to MP3
      console.log('Stage 2: Converting WAV to MP3...');
      await new Promise((resolve, reject) => {
        ffmpeg()
          .input(tempWavFile)
          .output(outputFile)
          .audioCodec('libmp3lame')
          .audioBitrate('64k')
          .on('end', () => {
            console.log(`MP3 conversion complete: ${outputFile}`);
            // Clean up temporary WAV file
            try {
              fs.unlinkSync(tempWavFile);
              console.log(`Deleted temporary WAV file`);
            } catch (err) {
              console.error(`Error deleting temporary WAV file: ${err.message}`);
            }
            resolve();
          })
          .on('error', (err) => {
            console.error(`Error converting to MP3: ${err.message}`);
            reject(err);
          })
          .run();
      });
      
      return outputFile;
    } catch (error) {
      console.error(`Multi-stage conversion failed: ${error.message}`);
      throw error;
    }
  } else {
    // For non-WebM files, use the standard approach
    return new Promise((resolve, reject) => {
      ffmpeg(inputFile)
        .output(outputFile)
        .audioCodec('libmp3lame')
        .audioBitrate('64k') // Lower bitrate for smaller file size
        .audioChannels(1) // Mono audio
        .audioFrequency(16000) // 16kHz sample rate (good for speech)
        .outputOptions([
          '-af aresample=async=1' // Handle asynchronous audio streams
        ])
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
}

/**
 * Split audio file into chunks of appropriate size
 */
async function splitAudioFile(inputFile, outputDir) {
  // Get audio duration
  const metadata = await getAudioMetadata(inputFile);
  const duration = metadata.format.duration;
  const fileSize = fs.statSync(inputFile).size;
  
  console.log(`Audio duration: ${duration.toFixed(2)} seconds`);
  
  // Calculate optimal segment duration (in seconds)
  // Use 80% of max size to be safe
  const bytesPerSecond = fileSize / duration;
  const segmentDuration = Math.floor((MAX_FILE_SIZE * 0.8) / bytesPerSecond);
  
  console.log(`Bytes per second: ${(bytesPerSecond / 1024).toFixed(2)} KB/s`);
  console.log(`Segment duration: ${segmentDuration} seconds`);
  
  // Calculate number of segments
  const numSegments = Math.ceil(duration / segmentDuration);
  console.log(`Splitting into ${numSegments} segments`);
  
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
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`Splitting progress: ${Math.round(progress.percent)}%`);
        }
      })
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

// Run the main function
processLargeFile();
