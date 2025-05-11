/**
 * WebM File Validator
 * 
 * This module provides functions to validate WebM files before processing them.
 * It checks for valid header structure and other indicators of file integrity.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Check if a WebM file is valid
 * 
 * @param {string} filePath - Path to the WebM file
 * @returns {Promise<{isValid: boolean, details: string}>} - Validation result
 */
async function validateWebMFile(filePath) {
  try {
    console.log(`Validating WebM file: ${filePath}`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return {
        isValid: false,
        details: `File not found: ${filePath}`
      };
    }
    
    // Check file extension
    const fileExt = path.extname(filePath).toLowerCase();
    if (fileExt !== '.webm') {
      console.log(`File has extension ${fileExt}, not .webm. Skipping WebM validation.`);
      return { isValid: true, details: 'Not a WebM file, skipping validation' };
    }
    
    // Check file size
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      return {
        isValid: false,
        details: 'File is empty (0 bytes)'
      };
    }
    
    // Check file header (first few bytes)
    const buffer = Buffer.alloc(16);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);
    
    // WebM files should start with 0x1A45DFA3 (EBML header)
    const validHeader = buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3;
    
    if (!validHeader) {
      return {
        isValid: false,
        details: `Invalid WebM header. Expected header to start with: 1A 45 DF A3, but got: ${buffer.slice(0, 4).toString('hex')}`
      };
    }
    
    // Try to get file information using ffprobe
    try {
      await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(metadata);
        });
      });
      
      // If we got here, ffprobe was successful
      return {
        isValid: true,
        details: 'WebM file is valid'
      };
    } catch (ffprobeError) {
      return {
        isValid: false,
        details: `ffprobe validation failed: ${ffprobeError.message}`
      };
    }
  } catch (error) {
    console.error('Error validating WebM file:', error);
    return {
      isValid: false,
      details: `Validation error: ${error.message}`
    };
  }
}

/**
 * Check if any audio file is valid (not just WebM)
 * 
 * @param {string} filePath - Path to the audio file
 * @returns {Promise<{isValid: boolean, details: string}>} - Validation result
 */
async function validateAudioFile(filePath) {
  try {
    console.log(`Validating audio file: ${filePath}`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return {
        isValid: false,
        details: `File not found: ${filePath}`
      };
    }
    
    // Check file size
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      return {
        isValid: false,
        details: 'File is empty (0 bytes)'
      };
    }
    
    // Get file extension
    const fileExt = path.extname(filePath).toLowerCase();
    
    // For WebM files, do specific WebM validation
    if (fileExt === '.webm') {
      return validateWebMFile(filePath);
    }
    
    // For other audio formats, use ffprobe to check
    try {
      await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
          if (err) {
            reject(err);
            return;
          }
          
          // Check if file has audio streams
          if (!metadata.streams || !metadata.streams.some(stream => stream.codec_type === 'audio')) {
            reject(new Error('No audio streams found in file'));
            return;
          }
          
          resolve(metadata);
        });
      });
      
      // If we got here, ffprobe was successful
      return {
        isValid: true,
        details: 'Audio file is valid'
      };
    } catch (ffprobeError) {
      return {
        isValid: false,
        details: `Audio validation failed: ${ffprobeError.message}`
      };
    }
  } catch (error) {
    console.error('Error validating audio file:', error);
    return {
      isValid: false,
      details: `Validation error: ${error.message}`
    };
  }
}

module.exports = {
  validateWebMFile,
  validateAudioFile
};
