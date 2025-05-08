// Tests for continuing recordings functionality
jest.mock('../app.js', () => require('./mocks/app.js'));

describe('Continue Recording Tests', () => {
  // Set up the DOM elements needed for tests
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="container three-column-layout">
        <div class="main-content">
          <div class="transcription-container" id="transcriptionContainer">
            <div class="transcription-text" id="transcriptionText">Test transcription</div>
            <div class="transcription-actions">
              <button id="continueRecordingBtn" class="continue-btn">
                <i class="fas fa-microphone"></i> Continue Recording
              </button>
              <button id="mergeTranscriptionsBtn" class="merge-btn hidden">
                <i class="fas fa-object-group"></i> Merge Transcriptions
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Mock the state object
    global.state = {
      isRecording: false,
      mediaRecorder: null,
      audioChunks: [],
      recordingStartTime: null,
      recordingElapsedTime: 0,
      currentRecordingId: 'rec123',
      relatedRecordings: [],
      continuationMode: false,
      recordings: [
        {
          id: 'rec123',
          title: 'Test Recording',
          timestamp: new Date('2025-05-08T10:00:00').getTime(),
          language: 'english',
          transcription: 'Test transcription'
        }
      ]
    };
  });
  
  test('Continue recording button should be visible after transcription is displayed', () => {
    // Import the function
    const { displayTranscription } = require('../app.js');
    
    // Call displayTranscription with a recording
    const recording = {
      id: 'rec123',
      title: 'Test Recording',
      timestamp: new Date('2025-05-08T10:00:00').getTime(),
      language: 'english',
      transcription: 'Test transcription'
    };
    
    displayTranscription(recording);
    
    // Check if the continue recording button is visible
    const continueRecordingBtn = document.getElementById('continueRecordingBtn');
    expect(continueRecordingBtn).not.toBeNull();
    expect(continueRecordingBtn.classList.contains('hidden')).toBeFalsy();
  });
  
  test('Clicking continue recording button should create continuation container', () => {
    // Import the functions
    const { continueRecording } = require('../app.js');
    
    // Get the continue recording button and attach the event listener
    const continueRecordingBtn = document.getElementById('continueRecordingBtn');
    continueRecordingBtn.addEventListener('click', continueRecording);
    
    // Simulate clicking the button
    continueRecordingBtn.click();
    
    // Check if the continuation container was created
    const continuationContainer = document.getElementById('continuationContainer');
    expect(continuationContainer).not.toBeNull();
    expect(continuationContainer.classList.contains('continuation-container')).toBeTruthy();
  });
  
  test('Continuation container should have record button and controls', () => {
    // Import the functions
    const { continueRecording } = require('../app.js');
    
    // Call continueRecording directly
    continueRecording();
    
    // Check if the continuation container has the necessary elements
    const continuationContainer = document.getElementById('continuationContainer');
    expect(continuationContainer).not.toBeNull();
    
    // Check for record button
    const recordBtn = continuationContainer.querySelector('.continuation-record-btn');
    expect(recordBtn).not.toBeNull();
    
    // Check for timer
    const timer = continuationContainer.querySelector('#continuationTimer');
    expect(timer).not.toBeNull();
    
    // Check for action buttons
    const actionButtons = document.getElementById('continuationActionButtons');
    expect(actionButtons).not.toBeNull();
    expect(actionButtons.querySelector('#continuationSaveBtn')).not.toBeNull();
    expect(actionButtons.querySelector('#continuationCancelBtn')).not.toBeNull();
  });
  
  test('Continuation mode should be set when continuing recording', () => {
    // Import the functions
    const { continueRecording } = require('../app.js');
    
    // Call continueRecording
    continueRecording();
    
    // Check if continuationMode is set to true
    expect(global.state.continuationMode).toBeTruthy();
  });
  
  test('Current recording ID should be added to related recordings', () => {
    // Import the functions
    const { continueRecording } = require('../app.js');
    
    // Set current recording ID
    global.state.currentRecordingId = 'rec123';
    
    // Call continueRecording
    continueRecording();
    
    // Check if current recording ID was added to related recordings
    expect(global.state.relatedRecordings).toContain('rec123');
  });
  
  test('Merge button should be visible when there are related recordings', () => {
    // Import the functions
    const { continueRecording } = require('../app.js');
    
    // Set up related recordings
    global.state.relatedRecordings = [];
    
    // Call continueRecording
    continueRecording();
    
    // Check if merge button is visible
    const mergeBtn = document.getElementById('mergeTranscriptionsBtn');
    expect(mergeBtn.classList.contains('hidden')).toBeFalsy();
  });
  
  test('Auto-scroll should focus on new recording section', () => {
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = jest.fn();
    
    // Import the functions
    const { continueRecording } = require('../app.js');
    
    // Call continueRecording
    continueRecording();
    
    // Get the continuation container
    const continuationContainer = document.getElementById('continuationContainer');
    
    // Check if scrollIntoView was called on the continuation container
    expect(continuationContainer.scrollIntoView).toHaveBeenCalled();
  });
});
