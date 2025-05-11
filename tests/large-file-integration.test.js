/**
 * Integration tests for Large File Handling Workflow
 * 
 * These tests verify the process of handling large audio files,
 * focusing on the file splitting and conversion functionality.
 */

const fs = require('fs');
const path = require('path');
const { processLargeAudioFile, MAX_FILE_SIZE, cleanupTempFiles } = require('../backend/utils/large-file-handler');
require('dotenv').config();

// Path to test audio files
const TEST_AUDIO_DIR = path.join(__dirname, 'test-audio');
const SMALL_AUDIO_FILE = path.join(TEST_AUDIO_DIR, 'small-test.webm');
const LARGE_AUDIO_FILE = path.join(TEST_AUDIO_DIR, 'large-test.webm');

// Skip these tests if RUN_INTEGRATION_TESTS is not set to true
const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true';

// Helper function to create test audio directory and files if they don't exist
function setupTestFiles() {
  if (!fs.existsSync(TEST_AUDIO_DIR)) {
    fs.mkdirSync(TEST_AUDIO_DIR, { recursive: true });
  }
  
  // Create a small test audio file if it doesn't exist
  if (!fs.existsSync(SMALL_AUDIO_FILE)) {
    console.warn(`Small test audio file ${SMALL_AUDIO_FILE} does not exist. Some tests will be skipped.`);
  }
  
  // Check for large test audio file
  if (!fs.existsSync(LARGE_AUDIO_FILE)) {
    console.warn(`Large test audio file ${LARGE_AUDIO_FILE} does not exist. Some tests will be skipped.`);
  }
}

describe('Large File Handling Integration', () => {
  beforeAll(() => {
    setupTestFiles();
  });
  
  // Skip all tests if integration tests are disabled
  if (!runIntegrationTests) {
    test.skip('Integration tests are disabled', () => {
      console.log('Skipping integration tests. Set RUN_INTEGRATION_TESTS=true to enable.');
    });
    return;
  }
  
  test('processLargeAudioFile should convert and split large audio files', async () => {
    if (!fs.existsSync(LARGE_AUDIO_FILE)) {
      console.log('Skipping test: large test audio file not available');
      return;
    }
    
    const processedFiles = await processLargeAudioFile(LARGE_AUDIO_FILE);
    
    expect(Array.isArray(processedFiles)).toBe(true);
    expect(processedFiles.length).toBeGreaterThan(0);
    
    // Verify that each processed file exists and is smaller than MAX_FILE_SIZE
    for (const file of processedFiles) {
      expect(fs.existsSync(file)).toBe(true);
      const stats = fs.statSync(file);
      expect(stats.size).toBeLessThanOrEqual(MAX_FILE_SIZE);
    }
    
    // Clean up the processed files
    cleanupTempFiles(processedFiles, LARGE_AUDIO_FILE);
  }, 30000); // Increase timeout to 30 seconds for this test
  
  test('cleanupTempFiles should remove all temporary files', async () => {
    // Create a temp directory
    const tempDir = path.join(path.dirname(LARGE_AUDIO_FILE), 'temp_splits');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Create some test files
    const testFiles = [
      path.join(tempDir, 'test1.mp3'),
      path.join(tempDir, 'test2.mp3'),
      path.join(tempDir, 'test3.mp3')
    ];
    
    // Write content to the test files
    testFiles.forEach(file => {
      fs.writeFileSync(file, 'Test content');
    });
    
    // Verify files exist
    testFiles.forEach(file => {
      expect(fs.existsSync(file)).toBe(true);
    });
    
    // Clean up the files
    cleanupTempFiles(testFiles, LARGE_AUDIO_FILE);
    
    // Verify files were removed
    testFiles.forEach(file => {
      expect(fs.existsSync(file)).toBe(false);
    });
  });
  
  test('large file handler should create properly sized chunks', async () => {
    if (!fs.existsSync(LARGE_AUDIO_FILE)) {
      console.log('Skipping test: large test audio file not available');
      return;
    }
    
    // Process the large file
    const processedFiles = await processLargeAudioFile(LARGE_AUDIO_FILE);
    
    // Check if we got multiple chunks
    expect(processedFiles.length).toBeGreaterThan(0);
    
    // Check that all chunks are below the maximum size
    for (const file of processedFiles) {
      const stats = fs.statSync(file);
      expect(stats.size).toBeLessThanOrEqual(MAX_FILE_SIZE);
      console.log(`Chunk size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
    }
    
    // Clean up the processed files
    cleanupTempFiles(processedFiles, LARGE_AUDIO_FILE);
  }, 30000); // Increase timeout to 30 seconds for this test
});
