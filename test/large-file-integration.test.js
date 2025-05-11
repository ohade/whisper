/**
 * Integration tests for Large File Handling Workflow
 * 
 * These tests verify the end-to-end process of handling large audio files,
 * including conversion, splitting, transcription, and cleanup.
 */

const fs = require('fs');
const path = require('path');
const { transcribeWithWhisper } = require('../backend/utils/whisper-transcription');
const { processLargeAudioFile, MAX_FILE_SIZE } = require('../backend/utils/large-file-handler');
const OpenAI = require('openai');
require('dotenv').config();

// Skip these tests if OPENAI_API_KEY is not available
const runIntegrationTests = process.env.OPENAI_API_KEY && process.env.RUN_INTEGRATION_TESTS === 'true';

// Path to test audio files
const TEST_AUDIO_DIR = path.join(__dirname, 'test-audio');
const SMALL_AUDIO_FILE = path.join(TEST_AUDIO_DIR, 'small-test.mp3');
const LARGE_AUDIO_FILE = path.join(TEST_AUDIO_DIR, 'large-test.webm');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
  }, 30000); // Increase timeout to 30 seconds for this test
  
  test('transcribeWithWhisper should handle small audio files correctly', async () => {
    if (!fs.existsSync(SMALL_AUDIO_FILE)) {
      console.log('Skipping test: small test audio file not available');
      return;
    }
    
    const transcription = await transcribeWithWhisper(openai, SMALL_AUDIO_FILE, 'en');
    
    expect(typeof transcription).toBe('string');
    expect(transcription.length).toBeGreaterThan(0);
  }, 20000); // Increase timeout to 20 seconds for this test
  
  test('transcribeWithWhisper should handle large audio files correctly', async () => {
    if (!fs.existsSync(LARGE_AUDIO_FILE)) {
      console.log('Skipping test: large test audio file not available');
      return;
    }
    
    const transcription = await transcribeWithWhisper(openai, LARGE_AUDIO_FILE, 'en');
    
    expect(typeof transcription).toBe('string');
    expect(transcription.length).toBeGreaterThan(0);
    
    // Check if a transcription file was created for debugging
    const transcriptionFile = path.join(
      path.dirname(LARGE_AUDIO_FILE),
      `${path.basename(LARGE_AUDIO_FILE, path.extname(LARGE_AUDIO_FILE))}_transcription.txt`
    );
    expect(fs.existsSync(transcriptionFile)).toBe(true);
    
    // Clean up transcription file
    fs.unlinkSync(transcriptionFile);
  }, 60000); // Increase timeout to 60 seconds for this test
  
  test('End-to-end workflow should clean up temporary files', async () => {
    if (!fs.existsSync(LARGE_AUDIO_FILE)) {
      console.log('Skipping test: large test audio file not available');
      return;
    }
    
    // Get the temp directory path
    const tempDir = path.join(path.dirname(LARGE_AUDIO_FILE), 'temp_splits');
    
    // Run transcription with cleanup enabled
    await transcribeWithWhisper(openai, LARGE_AUDIO_FILE, 'en', true);
    
    // Check if temp directory exists but is empty
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      expect(files.length).toBe(0);
    }
  }, 60000); // Increase timeout to 60 seconds for this test
});
