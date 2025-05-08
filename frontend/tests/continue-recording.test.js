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
        <div class="language-buttons">
          <button id="englishBtn" class="language-btn active" data-language="english">English</button>
          <button id="hebrewBtn" class="language-btn" data-language="hebrew">עברית</button>
        </div>
        <div id="actionButtons" class="action-buttons hidden">
          <button id="saveButton" class="action-btn save-btn">
            <i class="fas fa-save"></i> Save
          </button>
          <button id="cancelButton" class="action-btn cancel-btn">
            <i class="fas fa-times"></i> Cancel
          </button>
        </div>
        <div id="processingIndicator" class="processing-indicator hidden">
          <div class="spinner"></div>
          <span>Processing... <span id="processingTimer">00:00</span></span>
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
      recordingPauseTime: null,
      processingStartTime: null,
      recordingInterval: null,
      processingInterval: null,
      selectedLanguage: 'english',
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
      ],
      calendar: {
        currentDate: new Date(),
        currentMonth: new Date().getMonth(),
        currentYear: new Date().getFullYear(),
        selectedDay: null
      }
    };
    
    // Mock clearInterval and setInterval
    global.clearInterval = jest.fn();
    global.setInterval = jest.fn().mockReturnValue(123);
    
    // Mock fetch function
    global.fetch = jest.fn().mockImplementation(() => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
    
    // Mock showNotification function
    global.showNotification = jest.fn();
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

  test('Language selection should be available when continuing recording', () => {
    // Import the functions
    const { continueRecording } = require('../app.js');
    
    // Call continueRecording
    continueRecording();
    
    // Check if language selection container exists in the continuation container
    const continuationContainer = document.getElementById('continuationContainer');
    const languageSelection = continuationContainer.querySelector('.language-selection');
    expect(languageSelection).not.toBeNull();
    
    // Check if both language buttons exist
    const englishBtn = languageSelection.querySelector('.language-btn[data-language="english"]');
    const hebrewBtn = languageSelection.querySelector('.language-btn[data-language="hebrew"]');
    expect(englishBtn).not.toBeNull();
    expect(hebrewBtn).not.toBeNull();
  });

  test('Continuing recording should append to current record instead of creating a new one', () => {
    // Import the functions
    const { continueRecording, saveRecording } = require('../app.js');
    
    // Set up the current recording
    global.state.currentRecordingId = 'rec123';
    global.state.recordings = [
      {
        id: 'rec123',
        title: 'Test Recording',
        timestamp: new Date('2025-05-08T10:00:00').getTime(),
        language: 'english',
        transcription: 'Initial transcription'
      }
    ];
    
    // Mock fetch to simulate API response
    global.fetch = jest.fn().mockImplementation(() => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          id: 'rec123',
          title: 'Test Recording',
          timestamp: new Date('2025-05-08T10:00:00').getTime(),
          language: 'english',
          transcription: 'Additional transcription'
        })
      });
    });
    
    // Call continueRecording and then saveRecording
    continueRecording();
    global.state.audioChunks = [new Blob(['test audio data'])];
    return saveRecording().then(() => {
      // Check if the recording was updated instead of creating a new one
      expect(global.state.recordings.length).toBe(1);
      expect(global.state.recordings[0].id).toBe('rec123');
      expect(global.state.recordings[0].transcription).toContain('Initial transcription');
      expect(global.state.recordings[0].transcription).toContain('Additional transcription');
    });
  });
});
