/**
 * WebM Validator Tests
 * 
 * This file contains tests for the WebM validator utility.
 */

const fs = require('fs');
const path = require('path');
const { validateWebMFile, validateAudioFile } = require('../backend/utils/webm-validator');

// Test file paths
const VALID_MP3_PATH = path.join(__dirname, 'fixtures/valid-audio.mp3');
const VALID_WEBM_PATH = path.join(__dirname, 'fixtures/valid-audio.webm');
const INVALID_WEBM_PATH = path.join(__dirname, 'fixtures/invalid-audio.webm');
const NON_EXISTENT_PATH = path.join(__dirname, 'fixtures/non-existent.webm');

// Create fixtures directory if it doesn't exist
const fixturesDir = path.join(__dirname, 'fixtures');
if (!fs.existsSync(fixturesDir)) {
  fs.mkdirSync(fixturesDir, { recursive: true });
}

// Create a simple valid MP3 file for testing if it doesn't exist
if (!fs.existsSync(VALID_MP3_PATH)) {
  console.log('Creating test MP3 file...');
  // This is just a placeholder - in a real test, you would use a real MP3 file
  fs.writeFileSync(VALID_MP3_PATH, 'This is a placeholder for a valid MP3 file');
}

// Main test function
async function runTests() {
  console.log('Running WebM validator tests...\n');
  
  // Test 1: Non-existent file
  console.log('Test 1: Non-existent file');
  try {
    const result = await validateAudioFile(NON_EXISTENT_PATH);
    console.log(`Result: ${result.isValid ? 'VALID' : 'INVALID'}`);
    console.log(`Details: ${result.details}`);
    console.log(`Expected: INVALID - File not found\n`);
  } catch (error) {
    console.error('Test 1 failed with error:', error);
  }
  
  // Test 2: Valid MP3 file (assuming the file exists)
  console.log('Test 2: Valid MP3 file');
  try {
    const result = await validateAudioFile(VALID_MP3_PATH);
    console.log(`Result: ${result.isValid ? 'VALID' : 'INVALID'}`);
    console.log(`Details: ${result.details}`);
    console.log(`Note: This test may fail if the placeholder MP3 is not a real MP3 file\n`);
  } catch (error) {
    console.error('Test 2 failed with error:', error);
  }
  
  // Test 3: Valid WebM file (if available)
  console.log('Test 3: Valid WebM file');
  if (fs.existsSync(VALID_WEBM_PATH)) {
    try {
      const result = await validateWebMFile(VALID_WEBM_PATH);
      console.log(`Result: ${result.isValid ? 'VALID' : 'INVALID'}`);
      console.log(`Details: ${result.details}\n`);
    } catch (error) {
      console.error('Test 3 failed with error:', error);
    }
  } else {
    console.log('Skipped - No valid WebM file available for testing\n');
  }
  
  // Test 4: Invalid WebM file (if available)
  console.log('Test 4: Invalid WebM file');
  if (fs.existsSync(INVALID_WEBM_PATH)) {
    try {
      const result = await validateWebMFile(INVALID_WEBM_PATH);
      console.log(`Result: ${result.isValid ? 'VALID' : 'INVALID'}`);
      console.log(`Details: ${result.details}\n`);
    } catch (error) {
      console.error('Test 4 failed with error:', error);
    }
  } else {
    console.log('Skipped - No invalid WebM file available for testing\n');
  }
  
  // Test 5: The problematic WebM file
  const problemWebMPath = '/Users/ohadedelstein/projects/playground/whisper/uploads/recording-1746961155573.webm';
  console.log('Test 5: Problematic WebM file');
  if (fs.existsSync(problemWebMPath)) {
    try {
      const result = await validateWebMFile(problemWebMPath);
      console.log(`Result: ${result.isValid ? 'VALID' : 'INVALID'}`);
      console.log(`Details: ${result.details}\n`);
    } catch (error) {
      console.error('Test 5 failed with error:', error);
    }
  } else {
    console.log('Skipped - Problematic WebM file not found\n');
  }
  
  console.log('WebM validator tests completed');
}

// Run the tests
runTests();
