/**
 * Audio File Repair Utility
 * 
 * This script attempts to repair problematic audio files by extracting
 * the audio stream and creating a new file in a supported format.
 * It preserves the original file and creates a new one for processing.
 */

const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { execSync } = require('child_process');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

// Get command line arguments
const args = process.argv.slice(2);
const fileArg = args.find(arg => arg.startsWith('--file='));

// Validate arguments
if (!fileArg) {
  console.error('Error: File parameter is required');
  console.error('Usage: node repair-audio.js --file=/path/to/file.webm');
  process.exit(1);
}

const FILE_PATH = fileArg.split('=')[1];

/**
 * Main function to repair audio file
 */
async function repairAudioFile() {
  try {
    console.log(`Attempting to repair file: ${FILE_PATH}`);
    
    // Check if file exists
    if (!fs.existsSync(FILE_PATH)) {
      console.error(`File not found: ${FILE_PATH}`);
      process.exit(1);
    }
    
    // Get file stats
    const stats = fs.statSync(FILE_PATH);
    console.log(`Original file size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
    
    // Create output directory
    const outputDir = path.join(path.dirname(FILE_PATH), 'repaired');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Get file name and extension
    const fileExt = path.extname(FILE_PATH);
    const fileName = path.basename(FILE_PATH, fileExt);
    
    // Try multiple repair approaches
    const approaches = [
      { name: 'WAV extraction', ext: '.wav', fn: extractToWav },
      { name: 'MP3 conversion', ext: '.mp3', fn: convertToMp3 },
      { name: 'OGG conversion', ext: '.ogg', fn: convertToOgg },
      { name: 'FLAC conversion', ext: '.flac', fn: convertToFlac }
    ];
    
    const results = [];
    
    for (const approach of approaches) {
      const outputFile = path.join(outputDir, `${fileName}_repaired${approach.ext}`);
      console.log(`\nTrying approach: ${approach.name}`);
      
      try {
        await approach.fn(FILE_PATH, outputFile);
        
        // Verify the file was created and has content
        if (fs.existsSync(outputFile) && fs.statSync(outputFile).size > 0) {
          const fileSize = fs.statSync(outputFile).size;
          console.log(`✅ Success! Created ${approach.ext} file: ${outputFile}`);
          console.log(`   File size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`);
          
          // Test the file with ffprobe
          try {
            const duration = await getAudioDuration(outputFile);
            console.log(`   Duration: ${duration.toFixed(2)} seconds`);
            results.push({
              approach: approach.name,
              file: outputFile,
              size: fileSize,
              duration
            });
          } catch (err) {
            console.error(`   ⚠️ Warning: File created but may be invalid: ${err.message}`);
          }
        } else {
          console.error(`   ❌ Failed: Output file was not created or is empty`);
        }
      } catch (err) {
        console.error(`   ❌ Failed: ${err.message}`);
      }
    }
    
    // Report results
    console.log('\n=== REPAIR RESULTS ===');
    if (results.length === 0) {
      console.error('❌ All repair approaches failed. The file may be severely corrupted.');
    } else {
      console.log(`✅ Successfully repaired file using ${results.length} approach(es):`);
      results.forEach((result, index) => {
        console.log(`${index + 1}. ${result.approach}: ${path.basename(result.file)}`);
        console.log(`   Size: ${(result.size / (1024 * 1024)).toFixed(2)} MB, Duration: ${result.duration.toFixed(2)} seconds`);
      });
      
      console.log('\nTo use with Whisper API, run:');
      console.log(`node process-large-file.js --lang=hebrew --file="${results[0].file}"`);
    }
    
  } catch (error) {
    console.error('Error repairing file:', error);
  }
}

/**
 * Extract audio to WAV format
 */
async function extractToWav(inputFile, outputFile) {
  return new Promise((resolve, reject) => {
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
      .output(outputFile)
      .on('end', () => {
        resolve(outputFile);
      })
      .on('error', (err) => {
        reject(err);
      })
      .run();
  });
}

/**
 * Convert to MP3 format
 */
async function convertToMp3(inputFile, outputFile) {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(inputFile)
      .inputOptions([
        '-ignore_unknown',
        '-analyzeduration 100M',
        '-probesize 100M'
      ])
      .outputOptions([
        '-vn', // No video
        '-acodec libmp3lame',
        '-b:a 64k',
        '-ar 16000', // 16kHz sample rate
        '-ac 1' // Mono
      ])
      .output(outputFile)
      .on('end', () => {
        resolve(outputFile);
      })
      .on('error', (err) => {
        reject(err);
      })
      .run();
  });
}

/**
 * Convert to OGG format
 */
async function convertToOgg(inputFile, outputFile) {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(inputFile)
      .inputOptions([
        '-ignore_unknown',
        '-analyzeduration 100M',
        '-probesize 100M'
      ])
      .outputOptions([
        '-vn', // No video
        '-acodec libvorbis',
        '-q:a 3',
        '-ar 16000', // 16kHz sample rate
        '-ac 1' // Mono
      ])
      .output(outputFile)
      .on('end', () => {
        resolve(outputFile);
      })
      .on('error', (err) => {
        reject(err);
      })
      .run();
  });
}

/**
 * Convert to FLAC format
 */
async function convertToFlac(inputFile, outputFile) {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(inputFile)
      .inputOptions([
        '-ignore_unknown',
        '-analyzeduration 100M',
        '-probesize 100M'
      ])
      .outputOptions([
        '-vn', // No video
        '-acodec flac',
        '-compression_level 8',
        '-ar 16000', // 16kHz sample rate
        '-ac 1' // Mono
      ])
      .output(outputFile)
      .on('end', () => {
        resolve(outputFile);
      })
      .on('error', (err) => {
        reject(err);
      })
      .run();
  });
}

/**
 * Get audio duration using ffprobe
 */
async function getAudioDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (metadata && metadata.format && metadata.format.duration) {
        resolve(metadata.format.duration);
      } else {
        reject(new Error('Could not determine audio duration'));
      }
    });
  });
}

// Run the main function
repairAudioFile();
