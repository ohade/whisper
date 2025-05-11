/**
 * WebM File Validator
 * 
 * This script checks if a WebM file is valid and provides diagnostic information.
 * It can be used to identify problematic files before attempting to process them.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

// Get command line arguments
const args = process.argv.slice(2);
const fileArg = args.find(arg => arg.startsWith('--file='));

// Validate arguments
if (!fileArg) {
  console.error('Error: File parameter is required');
  console.error('Usage: node check-webm.js --file=/path/to/file.webm');
  process.exit(1);
}

const FILE_PATH = fileArg.split('=')[1];

/**
 * Main function to check WebM file
 */
async function checkWebMFile() {
  try {
    console.log(`Checking file: ${FILE_PATH}`);
    
    // Check if file exists
    if (!fs.existsSync(FILE_PATH)) {
      console.error(`File not found: ${FILE_PATH}`);
      process.exit(1);
    }
    
    // Get file stats
    const stats = fs.statSync(FILE_PATH);
    console.log(`File size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
    
    // Check file extension
    const fileExt = path.extname(FILE_PATH).toLowerCase();
    if (fileExt !== '.webm') {
      console.warn(`Warning: File extension is ${fileExt}, not .webm`);
    }
    
    // Check file header (first few bytes)
    const buffer = Buffer.alloc(16);
    const fd = fs.openSync(FILE_PATH, 'r');
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);
    
    console.log('File header (hex):', buffer.toString('hex'));
    
    // WebM files should start with 0x1A45DFA3 (EBML header)
    const validHeader = buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3;
    if (!validHeader) {
      console.error('❌ Invalid WebM header. The file is corrupted or not a valid WebM file.');
      console.log('Expected header to start with: 1A 45 DF A3');
      console.log('Actual header starts with:', buffer.slice(0, 4).toString('hex'));
    } else {
      console.log('✅ WebM header is valid.');
    }
    
    // Try to get file information using ffprobe
    console.log('\nAttempting to get file information with ffprobe...');
    try {
      const result = execSync(`ffprobe -v error -show_format -show_streams "${FILE_PATH}"`, { encoding: 'utf8' });
      console.log('✅ ffprobe analysis successful:');
      console.log(result);
    } catch (err) {
      console.error('❌ ffprobe analysis failed:', err.message);
      if (err.stderr) console.error(err.stderr);
    }
    
    // Recommendations based on analysis
    console.log('\n=== RECOMMENDATIONS ===');
    if (!validHeader) {
      console.log('1. The file has an invalid WebM header and is likely corrupted.');
      console.log('2. Request a new recording as this file cannot be processed.');
      console.log('3. If this is happening frequently, check the recording setup and software.');
    } else {
      console.log('1. The file appears to have a valid WebM header.');
      console.log('2. If you\'re still having issues, try converting it to a different format.');
      console.log('3. Consider using a specialized WebM repair tool if needed.');
    }
    
  } catch (error) {
    console.error('Error checking file:', error);
  }
}

// Run the main function
checkWebMFile();
