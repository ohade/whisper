/**
 * Audio Splitter Utility
 * 
 * This module provides functionality to split large audio files at quiet points
 * to ensure they can be processed by the OpenAI Whisper API, which has a 25MB limit.
 */

const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Maximum file size for OpenAI Whisper API (in bytes)
 * 25MB = 25 * 1024 * 1024
 */
const MAX_FILE_SIZE = 25 * 1024 * 1024;

/**
 * Splits an audio file into multiple smaller chunks at quiet points
 * 
 * @param {string} filePath - Path to the audio file to split
 * @param {string} outputDir - Directory to save the split files
 * @param {number} silenceThreshold - Silence detection threshold (dB) - default -30dB
 * @param {number} minSilenceDuration - Minimum silence duration to split at (seconds) - default 0.5s
 * @returns {Promise<string[]>} - Array of paths to the split audio files
 */
async function splitAudioAtQuietPoints(filePath, outputDir, silenceThreshold = -30, minSilenceDuration = 0.5) {
  // Get file stats to check size
  const stats = fs.statSync(filePath);
  console.log(`Original file size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Max allowed size: ${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(2)} MB`);
  
  // If file is already under the size limit, return it as is
  if (stats.size <= MAX_FILE_SIZE) {
    console.log('File is already under size limit, no need to split');
    return [filePath];
  }
  
  // Check if the file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Get file extension
  const fileExt = path.extname(filePath);
  const fileName = path.basename(filePath, fileExt);
  
  // Use ffmpeg to detect silence
  console.log(`Analyzing audio file for quiet points: ${filePath}`);
  
  return new Promise((resolve, reject) => {
    // First, detect silence in the audio file
    let silenceDetectionOutput = '';
    
    ffmpeg(filePath)
      .audioFilters(`silencedetect=noise=${silenceThreshold}dB:d=${minSilenceDuration}`)
      .format('null')
      .output('-')
      .on('stderr', (stderr) => {
        silenceDetectionOutput += stderr;
      })
      .on('error', (err) => {
        console.error('Error detecting silence:', err);
        reject(err);
      })
      .on('end', async () => {
        try {
          // Parse silence detection output
          const silenceRanges = parseSilenceDetectionOutput(silenceDetectionOutput);
          
          if (silenceRanges.length === 0) {
            console.log('No suitable silence points found for splitting. Using time-based splitting instead.');
            // Fall back to time-based splitting if no silence points are found
            const splitFiles = await splitAudioByDuration(filePath, outputDir);
            resolve(splitFiles);
            return;
          }
          
          // Calculate split points based on silence ranges and file size
          const splitPoints = calculateOptimalSplitPoints(silenceRanges, stats.size, MAX_FILE_SIZE);
          
          // Split the file at the calculated points
          const splitFiles = await splitAudioAtPoints(filePath, outputDir, splitPoints);
          
          console.log(`Split audio into ${splitFiles.length} chunks at quiet points`);
          resolve(splitFiles);
        } catch (error) {
          console.error('Error processing silence detection results:', error);
          reject(error);
        }
      })
      .run();
  });
}

/**
 * Parse ffmpeg silence detection output to get silence ranges
 * 
 * @param {string} output - ffmpeg stderr output containing silence detection info
 * @returns {Array<{start: number, end: number, duration: number}>} - Array of silence ranges
 */
function parseSilenceDetectionOutput(output) {
  const silenceRanges = [];
  const startMatches = output.matchAll(/silence_start: ([\d\.]+)/g);
  const endMatches = output.matchAll(/silence_end: ([\d\.]+) \| silence_duration: ([\d\.]+)/g);
  
  // Convert iterator to array
  const starts = Array.from(startMatches).map(match => parseFloat(match[1]));
  const ends = Array.from(endMatches).map(match => ({
    end: parseFloat(match[1]),
    duration: parseFloat(match[2])
  }));
  
  // Pair starts and ends
  if (starts.length === ends.length) {
    for (let i = 0; i < starts.length; i++) {
      silenceRanges.push({
        start: starts[i],
        end: ends[i].end,
        duration: ends[i].duration
      });
    }
  }
  
  return silenceRanges;
}

/**
 * Calculate optimal split points based on silence ranges and file size
 * 
 * @param {Array<{start: number, end: number, duration: number}>} silenceRanges - Array of silence ranges
 * @param {number} fileSize - Total file size in bytes
 * @param {number} maxChunkSize - Maximum chunk size in bytes
 * @returns {number[]} - Array of split points in seconds
 */
function calculateOptimalSplitPoints(silenceRanges, fileSize, maxChunkSize) {
  // Sort silence ranges by duration (longest first)
  const sortedRanges = [...silenceRanges].sort((a, b) => b.duration - a.duration);
  
  // Estimate number of chunks needed
  const estimatedChunks = Math.ceil(fileSize / maxChunkSize);
  
  // If we only need one chunk, no split points needed
  if (estimatedChunks <= 1) {
    return [];
  }
  
  // We need estimatedChunks-1 split points
  const neededSplitPoints = estimatedChunks - 1;
  
  // Take the middle of the top N longest silence periods
  let splitPoints = sortedRanges
    .slice(0, neededSplitPoints)
    .map(range => range.start + (range.duration / 2))
    .sort((a, b) => a - b); // Sort by time
  
  // If we don't have enough silence ranges, add more split points evenly
  if (splitPoints.length < neededSplitPoints) {
    // Get the audio duration from the last silence end or estimate it
    const audioDuration = silenceRanges.length > 0 
      ? Math.max(...silenceRanges.map(r => r.end))
      : (fileSize / (fileSize / maxChunkSize * 10)); // Rough estimate
    
    // Create evenly spaced split points
    const segmentDuration = audioDuration / estimatedChunks;
    
    // Create new array of split points
    const evenSplitPoints = [];
    for (let i = 1; i < estimatedChunks; i++) {
      evenSplitPoints.push(i * segmentDuration);
    }
    
    // Merge with existing split points and remove duplicates
    splitPoints = [...new Set([...splitPoints, ...evenSplitPoints])].sort((a, b) => a - b);
  }
  
  return splitPoints;
}

/**
 * Split audio file at specific time points
 * 
 * @param {string} filePath - Path to the audio file to split
 * @param {string} outputDir - Directory to save the split files
 * @param {number[]} splitPoints - Array of split points in seconds
 * @returns {Promise<string[]>} - Array of paths to the split audio files
 */
async function splitAudioAtPoints(filePath, outputDir, splitPoints) {
  const fileExt = path.extname(filePath);
  const fileName = path.basename(filePath, fileExt);
  const outputFiles = [];
  
  // Add start and end points
  const timeRanges = [];
  let startTime = 0;
  
  for (const splitPoint of splitPoints) {
    timeRanges.push({ start: startTime, end: splitPoint });
    startTime = splitPoint;
  }
  
  // Add the last segment
  timeRanges.push({ start: startTime, end: null }); // null means until the end
  
  // Process each time range
  const splitPromises = timeRanges.map((range, index) => {
    return new Promise((resolve, reject) => {
      const outputPath = path.join(outputDir, `${fileName}_part${index + 1}${fileExt}`);
      outputFiles.push(outputPath);
      
      let ffmpegCommand = ffmpeg(filePath)
        .setStartTime(range.start);
      
      if (range.end !== null) {
        ffmpegCommand = ffmpegCommand.setDuration(range.end - range.start);
      }
      
      ffmpegCommand
        .output(outputPath)
        .on('end', () => {
          console.log(`Created split file: ${outputPath}`);
          resolve();
        })
        .on('error', (err) => {
          console.error(`Error creating split file ${outputPath}:`, err);
          reject(err);
        })
        .run();
    });
  });
  
  await Promise.all(splitPromises);
  return outputFiles;
}

/**
 * Split audio file by duration as a fallback method
 * 
 * @param {string} filePath - Path to the audio file to split
 * @param {string} outputDir - Directory to save the split files
 * @returns {Promise<string[]>} - Array of paths to the split audio files
 */
async function splitAudioByDuration(filePath, outputDir) {
  // Get file stats
  const stats = fs.statSync(filePath);
  console.log(`Splitting file by duration: ${filePath}`);
  console.log(`File size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
  
  // Get file info to determine duration
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error('Error getting file metadata:', err);
        reject(err);
        return;
      }
      
      const duration = metadata.format.duration; // in seconds
      console.log(`Audio duration: ${duration.toFixed(2)} seconds`);
      
      const fileSize = stats.size;
      const bytesPerSecond = fileSize / duration;
      console.log(`Bytes per second: ${(bytesPerSecond / (1024 * 1024)).toFixed(2)} MB/s`);
      
      // Calculate how many seconds per chunk to stay under MAX_FILE_SIZE
      // Use 80% of max to be safe
      const secondsPerChunk = Math.floor((MAX_FILE_SIZE * 0.8) / bytesPerSecond);
      console.log(`Seconds per chunk: ${secondsPerChunk} seconds`);
      
      // Calculate number of chunks
      const numChunks = Math.ceil(duration / secondsPerChunk);
      console.log(`Splitting into ${numChunks} chunks`);
      
      // Create split points
      const splitPoints = [];
      for (let i = 1; i < numChunks; i++) {
        splitPoints.push(i * secondsPerChunk);
      }
      
      console.log(`Split points (in seconds): ${splitPoints.join(', ')}`);
      
      // For very large files, use a simpler approach with direct ffmpeg commands
      if (numChunks > 10 || stats.size > 100 * 1024 * 1024) { // If more than 10 chunks or 100MB
        console.log('Using direct ffmpeg segmentation for large file');
        splitLargeAudioDirectly(filePath, outputDir, secondsPerChunk)
          .then(splitFiles => resolve(splitFiles))
          .catch(error => reject(error));
      } else {
        // Split the file at calculated points
        splitAudioAtPoints(filePath, outputDir, splitPoints)
          .then(splitFiles => resolve(splitFiles))
          .catch(error => reject(error));
      }
    });
  });
}

/**
 * Split a very large audio file directly using ffmpeg segment
 * 
 * @param {string} filePath - Path to the audio file to split
 * @param {string} outputDir - Directory to save the split files
 * @param {number} segmentDuration - Duration of each segment in seconds
 * @returns {Promise<string[]>} - Array of paths to the split audio files
 */
async function splitLargeAudioDirectly(filePath, outputDir, segmentDuration) {
  const fileExt = path.extname(filePath);
  const fileName = path.basename(filePath, fileExt);
  // Always output as MP3 for better compatibility
  const outputPattern = path.join(outputDir, `${fileName}_part%03d.mp3`);
  
  console.log(`Splitting large file directly: ${filePath}`);
  console.log(`Segment duration: ${segmentDuration} seconds`);
  console.log(`Output pattern: ${outputPattern}`);
  
  return new Promise((resolve, reject) => {
    let ffmpegCommand = ffmpeg();
    
    // Check if the file is a webm file
    if (fileExt.toLowerCase() === '.webm') {
      console.log('Detected WebM file, using special handling...');
      // Add input options to better handle potentially problematic webm files
      ffmpegCommand = ffmpegCommand
        .input(filePath)
        .inputOptions([
          '-ignore_unknown', // Ignore unknown streams
          '-analyzeduration 100M', // Increase analysis time
          '-probesize 100M' // Increase probe size
        ]);
    } else {
      ffmpegCommand = ffmpegCommand.input(filePath);
    }
    
    ffmpegCommand
      .outputOptions([
        `-f segment`,
        `-segment_time ${segmentDuration}`,
        `-reset_timestamps 1`,
        // Don't use copy codec for webm files, transcode instead
        fileExt.toLowerCase() === '.webm' ? 
          `-c:a libmp3lame -b:a 64k -ac 1 -ar 16000` : 
          `-c copy`
      ])
      .outputOptions([
        '-af aresample=async=1' // Handle asynchronous audio streams
      ])
      .output(outputPattern)
      .on('end', () => {
        // Get all created files
        const files = fs.readdirSync(outputDir)
          .filter(file => file.startsWith(`${fileName}_part`) && file.endsWith('.mp3'))
          .map(file => path.join(outputDir, file));
        
        console.log(`Split into ${files.length} files`);
        resolve(files);
      })
      .on('error', (err) => {
        console.error('Error splitting file:', err);
        reject(err);
      })
      .run();
  });
}

module.exports = {
  splitAudioAtQuietPoints,
  MAX_FILE_SIZE
};
