// DOM Elements
const notificationBar = document.getElementById('notificationBar');
const notificationMessage = document.getElementById('notificationMessage');
const recordButton = document.getElementById('recordButton');
const recordingStatus = document.getElementById('recordingStatus');
const recordingTimer = document.getElementById('recordingTimer');
const actionButtons = document.getElementById('actionButtons');
const saveButton = document.getElementById('saveButton');
const cancelButton = document.getElementById('cancelButton');
const processingIndicator = document.getElementById('processingIndicator');
const processingTimer = document.getElementById('processingTimer');
const englishBtn = document.getElementById('englishBtn');
const hebrewBtn = document.getElementById('hebrewBtn');
const historyList = document.getElementById('historyList');
const recorderContainer = document.getElementById('recorderContainer');
const transcriptionContainer = document.getElementById('transcriptionContainer');
const transcriptionTitle = document.getElementById('transcriptionTitle');
const transcriptionDate = document.getElementById('transcriptionDate');
const transcriptionLanguage = document.getElementById('transcriptionLanguage');
const transcriptionText = document.getElementById('transcriptionText');
const audioPlayer = document.getElementById('audioPlayer');
const backButton = document.getElementById('backButton');
const saveEditedTitleBtn = document.getElementById('saveEditedTitleBtn');
const saveTranscriptionBtn = document.getElementById('saveTranscriptionBtn');
const tagsList = document.getElementById('tagsList');
const newTagInput = document.getElementById('newTagInput');
const addTagBtn = document.getElementById('addTagBtn');
const calendarTitle = document.getElementById('calendarTitle');
const calendarGrid = document.getElementById('calendarGrid');
const prevMonthBtn = document.getElementById('prevMonthBtn');
const nextMonthBtn = document.getElementById('nextMonthBtn');
const dayRecordingsPopup = document.getElementById('dayRecordingsPopup');
const deleteRecordingBtn = document.getElementById('deleteRecordingBtn');
const confirmationDialog = document.getElementById('confirmationDialog');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

// Color palette for tags (across the spectrum)
const TAG_COLORS = [
  '#4a6fa5', // Blue
  '#e74c3c', // Red
  '#2ecc71', // Green
  '#9b59b6', // Purple
  '#f39c12', // Orange
  '#1abc9c', // Teal
  '#d35400', // Dark Orange
  '#3498db', // Light Blue
  '#e67e22', // Amber
  '#16a085', // Green Sea
  '#8e44ad', // Violet
  '#27ae60', // Emerald
  '#c0392b', // Dark Red
  '#2980b9', // Belize Hole
  '#f1c40f', // Yellow
  '#7f8c8d', // Asbestos
  '#2c3e50', // Midnight Blue
  '#e84393', // Pink
  '#6c5ce7', // Blue Purple
  '#00cec9'  // Robin's Egg Blue
];

// App State
const state = {
  isRecording: false,
  mediaRecorder: null,
  audioChunks: [],
  recordingStartTime: null,
  recordingElapsedTime: 0,  // Track total elapsed time including pauses
  recordingPauseTime: null, // Track when recording was paused
  processingStartTime: null,
  recordingInterval: null,
  processingInterval: null,
  selectedLanguage: 'english',
  recordings: [],
  currentRecordingId: null,
  relatedRecordings: [], // For tracking recordings that should be merged
  continuationMode: false, // Flag for when continuing a recording
  tagColors: new Map(), // Map to store tag-to-color assignments
  calendar: {
    currentDate: new Date(),
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    selectedDay: null
  },
  autoSave: {
    titleTimer: null,
    transcriptionTimer: null
  }
};

// API Endpoints
const API_URL = 'http://localhost:3000/api';

// Function to move calendar to right panel
function moveCalendarToRightPanel() {
  // The calendar is already in the right panel in the HTML structure
  // This function is mainly for testing and to ensure the calendar is properly displayed
  
  // Make sure the container has the three-column layout class
  const container = document.querySelector('.container');
  if (!container.classList.contains('three-column-layout')) {
    container.classList.add('three-column-layout');
  }
  
  // Make sure the right panel is visible
  const rightPanel = document.getElementById('rightPanel');
  if (rightPanel) {
    rightPanel.style.display = 'block';
  }
  
  // Re-render the calendar to ensure it's properly displayed
  renderCalendar();
  
  // Log the change for debugging
  console.log('Calendar moved to right panel');
  
  return true;
}

// Initialize the app
async function initApp() {
  // Fetch recordings
  await fetchRecordings();
  
  // Set up event listeners
  setupEventListeners();
  
  // Render calendar
  renderCalendar();
  
  // Check if we have a recording ID in localStorage (from tag filter screen)
  const selectedRecordingId = localStorage.getItem('selectedRecordingId');
  if (selectedRecordingId) {
    // Fetch and display the recording
    await fetchRecordingDetails(selectedRecordingId);
    // Clear the localStorage item
    localStorage.removeItem('selectedRecordingId');
  }
}

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    moveCalendarToRightPanel,
    renderCalendar,
    handleCalendarDayClick,
    showDayRecordings
  };
}

// Set up event listeners
function setupEventListeners() {
  // Home button
  document.getElementById('homeButton').addEventListener('click', goToHomeScreen);
  
  // Record button
  recordButton.addEventListener('click', toggleRecording);
  
  // Language selection
  englishBtn.addEventListener('click', () => setLanguage('english'));
  hebrewBtn.addEventListener('click', () => setLanguage('hebrew'));
  
  // Back button
  backButton.addEventListener('click', () => {
    // If we're in continuation mode, ask for confirmation
    if (state.continuationMode) {
      if (confirm('Are you sure you want to go back? Any unsaved recording will be lost.')) {
        cancelContinuationRecording();
        goToHomeScreen();
      }
    } else {
      // Auto-save content before going back
      saveEditedTitle();
      saveEditedTranscription();
      goToHomeScreen();
    }
  });
  
  // Auto-save title on input and blur
  transcriptionTitle.addEventListener('input', () => {
    // Clear any existing timer
    if (state.autoSave.titleTimer) {
      clearTimeout(state.autoSave.titleTimer);
    }
    
    // Set a new timer to save after 500ms of inactivity
    state.autoSave.titleTimer = setTimeout(() => {
      saveEditedTitle();
    }, 500);
  });
  
  transcriptionTitle.addEventListener('blur', saveEditedTitle);
  
  // Auto-save transcription on input and blur
  transcriptionText.addEventListener('input', () => {
    // Clear any existing timer
    if (state.autoSave.transcriptionTimer) {
      clearTimeout(state.autoSave.transcriptionTimer);
    }
    
    // Set a new timer to save after 500ms of inactivity
    state.autoSave.transcriptionTimer = setTimeout(() => {
      saveEditedTranscription();
    }, 500);
  });
  
  transcriptionText.addEventListener('blur', saveEditedTranscription);
  
  // Delete recording
  deleteRecordingBtn.addEventListener('click', showDeleteConfirmation);
  
  // Confirmation dialog buttons
  confirmDeleteBtn.addEventListener('click', deleteRecording);
  cancelDeleteBtn.addEventListener('click', hideDeleteConfirmation);
  
  // Continue recording
  document.getElementById('continueRecordingBtn').addEventListener('click', continueRecording);
  
  // Merge transcriptions
  document.getElementById('mergeTranscriptionsBtn').addEventListener('click', mergeTranscriptions);
  
  // Add tag
  addTagBtn.addEventListener('click', addTag);
  newTagInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  });
  
  // Calendar navigation
  prevMonthBtn.addEventListener('click', () => {
    navigateMonth(-1);
  });
  
  nextMonthBtn.addEventListener('click', () => {
    navigateMonth(1);
  });
  
  // Close day recordings popup when clicking outside
  document.addEventListener('click', (e) => {
    if (!dayRecordingsPopup.contains(e.target) && 
        !e.target.classList.contains('calendar-day')) {
      dayRecordingsPopup.classList.add('hidden');
    }
  });
  
  // Add event listener for page visibility change to save content when user switches tabs
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && state.currentRecordingId) {
      saveEditedTitle();
      saveEditedTranscription();
    }
  });
  
  // Add event listener for beforeunload to save content when user closes the page
  window.addEventListener('beforeunload', () => {
    if (state.currentRecordingId) {
      saveEditedTitle();
      saveEditedTranscription();
    }
  });
}

// Toggle recording state
async function toggleRecording() {
  if (state.isRecording) {
    pauseRecording();
  } else {
    await startRecording();
  }
}

// Pause recording without clearing chunks
function pauseRecording() {
  if (state.mediaRecorder && state.isRecording) {
    state.mediaRecorder.pause();
    state.isRecording = false;
    
    // Store the time when recording was paused
    state.recordingPauseTime = Date.now();
    
    // Calculate elapsed time so far
    if (state.recordingStartTime) {
      state.recordingElapsedTime += (Date.now() - state.recordingStartTime);
    }
    
    // Clear timer
    clearInterval(state.recordingInterval);
    
    // Check if we're in continuation mode
    if (state.continuationMode) {
      // Update UI for continuation mode
      const continuationRecordButton = document.getElementById('continuationRecordButton');
      const continuationStatus = document.getElementById('continuationRecordingStatus');
      
      if (continuationRecordButton) {
        continuationRecordButton.classList.remove('recording');
      }
      
      if (continuationStatus) {
        const statusText = continuationStatus.querySelector('.status-text');
        if (statusText) {
          statusText.textContent = 'Recording paused';
        }
      }
    } else {
      // Update UI for normal mode
      recordButton.classList.remove('recording');
      recordingStatus.querySelector('.status-text').textContent = 'Recording paused';
    }
  }
}

// Start recording
async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // If we don't have a MediaRecorder yet or it's in a finished state, create a new one
    if (!state.mediaRecorder || state.mediaRecorder.state === 'inactive') {
      state.mediaRecorder = new MediaRecorder(stream);
      
      // Only clear chunks if we're starting a new recording (not continuing an existing one)
      if (state.audioChunks.length > 0) {
        console.log('Continuing with existing recording');
      } else {
        // New recording session
        state.audioChunks = [];
        console.log('Starting new recording');
      }
      
      state.mediaRecorder.addEventListener('dataavailable', event => {
        state.audioChunks.push(event.data);
      });
    } else if (state.mediaRecorder.state === 'paused') {
      // Resume the existing recording
      state.mediaRecorder.resume();
      console.log('Resuming paused recording');
    }
    
    if (state.mediaRecorder.state !== 'recording') {
      state.mediaRecorder.start(1000); // Collect data every second for better reliability
    }
    
    state.isRecording = true;
    
    // Set the new recording start time
    state.recordingStartTime = Date.now();
    
    // Check if we're in continuation mode
    if (state.continuationMode) {
      // Update UI for continuation mode
      const continuationRecordButton = document.getElementById('continuationRecordButton');
      const continuationStatus = document.getElementById('continuationRecordingStatus');
      const continuationActionButtons = document.getElementById('continuationActionButtons');
      
      if (continuationRecordButton) {
        continuationRecordButton.classList.add('recording');
      }
      
      if (continuationStatus) {
        const statusText = continuationStatus.querySelector('.status-text');
        if (statusText) {
          statusText.textContent = 'Recording...';
        }
      }
      
      if (continuationActionButtons) {
        continuationActionButtons.classList.remove('hidden');
      }
    } else {
      // Update UI for normal mode
      recordButton.classList.add('recording');
      recordingStatus.querySelector('.status-text').textContent = 'Recording...';
      actionButtons.classList.remove('hidden');
    }
    
    // Start timer
    state.recordingInterval = setInterval(updateRecordingTimer, 1000);
    
  } catch (error) {
    console.error('Error starting recording:', error);
    showNotification('Could not access microphone. Please check permissions.', 'error');
  }
}

// Stop recording
function stopRecording() {
  if (state.mediaRecorder && state.isRecording) {
    state.mediaRecorder.stop();
    state.isRecording = false;
    
    // Stop all tracks in the stream
    state.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    
    // Clear timer
    clearInterval(state.recordingInterval);
    
    // Check if we're in continuation mode
    if (state.continuationMode) {
      // Update UI for continuation mode
      const continuationRecordButton = document.getElementById('continuationRecordButton');
      const continuationStatus = document.getElementById('continuationRecordingStatus');
      
      if (continuationRecordButton) {
        continuationRecordButton.classList.remove('recording');
      }
      
      if (continuationStatus) {
        const statusText = continuationStatus.querySelector('.status-text');
        if (statusText) {
          statusText.textContent = 'Recording stopped';
        }
      }
    } else {
      // Update UI for normal mode
      recordButton.classList.remove('recording');
      recordingStatus.querySelector('.status-text').textContent = 'Recording stopped';
    }
  }
}

// Save recording
async function saveRecording() {
  // If in continuation mode, delegate to saveContinuationRecording
  if (state.continuationMode) {
    return saveContinuationRecording();
  }
  
  // If still recording, stop it first
  if (state.isRecording) {
    stopRecording();
  }
  
  if (state.audioChunks.length === 0) {
    return;
  }
  
  // Hide action buttons
  actionButtons.classList.add('hidden');
  
  // Show processing indicator
  processingIndicator.classList.remove('hidden');
  
  // Start processing timer
  state.processingStartTime = Date.now();
  state.processingInterval = setInterval(updateProcessingTimer, 1000);
  
  // Create audio blob
  const audioBlob = new Blob(state.audioChunks, { type: 'audio/webm' });
  
  // Create form data
  const formData = new FormData();
  formData.append('audio', audioBlob);
  formData.append('language', state.selectedLanguage);
  
  try {
    // Send to server
    const response = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Server error');
    }
    
    const result = await response.json();
    
    // Clear processing timer
    clearInterval(state.processingInterval);
    
    // Hide processing indicator
    processingIndicator.classList.add('hidden');
    
    // Reset recording state
    resetRecordingState();
    
    // Refresh recordings list
    await fetchRecordings();
    
    // Show transcription
    displayTranscription(result);
    
  } catch (error) {
    console.error('Error saving recording:', error);
    showNotification('Failed to process recording. Please try again.', 'error');
    
    // Clear processing timer
    clearInterval(state.processingInterval);
    
    // Hide processing indicator
    processingIndicator.classList.add('hidden');
    
    // Reset recording state
    resetRecordingState();
  }
}

// Cancel recording
function cancelRecording() {
  // Stop recording
  stopRecording();
  
  // Reset recording state
  resetRecordingState();
  
  // Hide action buttons
  actionButtons.classList.add('hidden');
}

// Reset recording state
function resetRecordingState(keepContinuationMode = false) {
  state.isRecording = false;
  state.audioChunks = [];
  state.recordingStartTime = null;
  state.recordingElapsedTime = 0;
  state.recordingPauseTime = null;
  
  // Clear timer interval
  if (state.recordingInterval) {
    clearInterval(state.recordingInterval);
    state.recordingInterval = null;
  }
  
  // Update UI
  recordButton.classList.remove('recording');
  recordingStatus.querySelector('.status-text').textContent = 'Ready to record';
  recordingTimer.textContent = '00:00';
  
  // Update continuation UI if in continuation mode
  if (state.continuationMode) {
    const continuationRecordButton = document.getElementById('continuationRecordButton');
    const continuationStatus = document.getElementById('continuationRecordingStatus');
    const continuationTimer = document.getElementById('continuationTimer');
    
    if (continuationRecordButton) {
      continuationRecordButton.classList.remove('recording');
    }
    
    if (continuationStatus) {
      const statusText = continuationStatus.querySelector('.status-text');
      if (statusText) {
        statusText.textContent = 'Ready to continue';
      }
    }
    
    if (continuationTimer) {
      continuationTimer.textContent = '00:00';
    }
  }
  
  // Reset continuation mode if not explicitly keeping it
  if (!keepContinuationMode) {
    state.continuationMode = false;
  }
}

// Update recording timer
function updateRecordingTimer() {
  if (!state.recordingStartTime) return;
  
  const now = Date.now();
  const elapsed = now - state.recordingStartTime + state.recordingElapsedTime;
  
  // Format time
  const seconds = Math.floor((elapsed / 1000) % 60);
  const minutes = Math.floor((elapsed / (1000 * 60)) % 60);
  const hours = Math.floor(elapsed / (1000 * 60 * 60));
  
  let timeString = '';
  
  if (hours > 0) {
    timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  // Update timer display
  recordingTimer.textContent = timeString;
  
  // If we're in continuation mode, also update the continuation timer
  if (state.continuationMode) {
    const continuationTimer = document.getElementById('continuationTimer');
    if (continuationTimer) {
      continuationTimer.textContent = timeString;
    }
  }
}

// Update processing timer
function updateProcessingTimer() {
  if (!state.processingStartTime) return;
  
  const elapsedTime = Math.floor((Date.now() - state.processingStartTime) / 1000);
  const minutes = Math.floor(elapsedTime / 60).toString().padStart(2, '0');
  const seconds = (elapsedTime % 60).toString().padStart(2, '0');
  
  processingTimer.textContent = `${minutes}:${seconds}`;
}

// Set language
function setLanguage(language) {
  state.selectedLanguage = language;
  
  // Update UI
  if (language === 'english') {
    englishBtn.classList.add('active');
    hebrewBtn.classList.remove('active');
  } else {
    englishBtn.classList.remove('active');
    hebrewBtn.classList.add('active');
  }
}

// Assign colors to tags
function assignTagColors() {
  // Keep track of used colors to avoid duplicates
  const usedColorIndices = new Set();
  let colorIndex = 0;
  
  // Collect all unique tags from all recordings
  const allTags = new Set();
  state.recordings.forEach(recording => {
    if (recording.tags && Array.isArray(recording.tags)) {
      recording.tags.forEach(tag => allTags.add(tag));
    }
  });
  
  // Assign colors to tags that don't have one yet
  allTags.forEach(tag => {
    if (!state.tagColors.has(tag)) {
      // Find an unused color
      while (usedColorIndices.has(colorIndex)) {
        colorIndex = (colorIndex + 1) % TAG_COLORS.length;
      }
      
      // Assign the color and mark it as used
      state.tagColors.set(tag, TAG_COLORS[colorIndex]);
      usedColorIndices.add(colorIndex);
      
      // Move to the next color for the next tag
      colorIndex = (colorIndex + 1) % TAG_COLORS.length;
    }
  });
}

// Fetch recordings
async function fetchRecordings() {
  try {
    const response = await fetch(`${API_URL}/recordings`);
    
    if (!response.ok) {
      throw new Error('Server error');
    }
    
    const recordings = await response.json();
    state.recordings = recordings;
    
    // Assign colors to tags
    assignTagColors();
    
    // Update UI
    renderRecordingsList();
    
    // Update calendar
    renderCalendar();
    
  } catch (error) {
    console.error('Error fetching recordings:', error);
  }
}

// Render recordings list
function renderRecordingsList() {
  if (state.recordings.length === 0) {
    historyList.innerHTML = '<div class="empty-history">No recordings yet</div>';
    return;
  }
  
  // Sort recordings by timestamp (newest first)
  const sortedRecordings = [...state.recordings].sort((a, b) => {
    return new Date(b.timestamp) - new Date(a.timestamp);
  });
  
  // Generate HTML
  const html = sortedRecordings.map(recording => {
    const date = new Date(recording.timestamp);
    const formattedDate = date.toLocaleDateString();
    const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const language = recording.language || 'english';
    
    return `
      <div class="history-item language-${language}" data-id="${recording.id}">
        <div class="history-title-container">
          <h3 class="history-title" data-id="${recording.id}">${recording.title}</h3>
          <button class="edit-title-btn" data-id="${recording.id}">
            <i class="fas fa-edit"></i>
          </button>
        </div>
        <div class="history-meta">
          <span>${formattedDate}, ${formattedTime}</span>
          <span class="language-indicator ${language}">${language === 'hebrew' ? 'Hebrew' : 'English'}</span>
        </div>
      </div>
    `;
  }).join('');
  
  historyList.innerHTML = html;
  
  // Add event listeners with improved handling
  const historyItems = document.querySelectorAll('.history-item');
  console.log(`Found ${historyItems.length} history items to attach listeners to`);
  
  historyItems.forEach(item => {
    const recordingId = item.getAttribute('data-id');
    console.log(`Attaching click listener to recording ID: ${recordingId}`);
    
    // Add click listener to the whole item for viewing recording
    item.addEventListener('click', function(e) {
      // Don't trigger if clicking on the edit button
      if (e.target.closest('.edit-title-btn')) {
        return;
      }
      
      e.preventDefault();
      console.log(`Clicked on recording ID: ${recordingId}`);
      fetchRecordingDetails(recordingId);
    });
  });
  
  // Add edit button listeners
  document.querySelectorAll('.edit-title-btn').forEach(btn => {
    const recordingId = btn.getAttribute('data-id');
    btn.addEventListener('click', function(e) {
      e.stopPropagation(); // Prevent triggering the parent click
      const titleElement = document.querySelector(`.history-title[data-id="${recordingId}"]`);
      
      // Make title editable
      titleElement.contentEditable = true;
      titleElement.focus();
      
      // Select all text
      const range = document.createRange();
      range.selectNodeContents(titleElement);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Change button to save button
      btn.innerHTML = '<i class="fas fa-save"></i>';
      btn.classList.add('save-title-btn');
      btn.classList.remove('edit-title-btn');
      
      // Add blur and keypress listeners to save on blur or Enter
      titleElement.addEventListener('blur', saveHistoryTitle);
      titleElement.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          titleElement.blur();
        }
      });
    });
  });
}

// Save history title when edited inline
async function saveHistoryTitle(event) {
  const titleElement = event.target;
  const recordingId = titleElement.getAttribute('data-id');
  const newTitle = titleElement.textContent.trim();
  
  console.log(`Saving history title: ${newTitle} for recording ID: ${recordingId}`);
  
  try {
    // Find the recording in state
    const recordingIndex = state.recordings.findIndex(r => r.id === recordingId);
    if (recordingIndex === -1) {
      throw new Error('Recording not found in state');
    }
    
    // Update the title
    state.recordings[recordingIndex].title = newTitle;
    
    // Save to server
    await updateRecordingOnServer(state.recordings[recordingIndex]);
    
    // Reset the button
    const btn = document.querySelector(`.save-title-btn[data-id="${recordingId}"]`);
    if (btn) {
      btn.innerHTML = '<i class="fas fa-edit"></i>';
      btn.classList.remove('save-title-btn');
      btn.classList.add('edit-title-btn');
    }
    
    // Make title non-editable
    titleElement.contentEditable = false;
    
    console.log('Title updated successfully');
  } catch (error) {
    console.error('Error saving history title:', error);
    showNotification(`Failed to save title: ${error.message}`, 'error');
    
    // Refresh the list to revert changes
    renderRecordingsList();
  }
}

// Fetch recording details
async function fetchRecordingDetails(id) {
  try {
    console.log(`Fetching details for recording ID: ${id}`);
    const url = `${API_URL}/recording/${id}`;
    console.log(`Request URL: ${url}`);
    
    const response = await fetch(url);
    console.log(`Response status: ${response.status}`);
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }
    
    const recording = await response.json();
    console.log('Recording details received:', recording);
    
    // Display transcription
    displayTranscription(recording);
    
  } catch (error) {
    console.error('Error fetching recording details:', error);
    showNotification(`Failed to fetch recording details: ${error.message}`, 'error');
  }
}

// Display transcription
function displayTranscription(recording) {
  try {
    // Clear any existing auto-save timers
    if (state.autoSave.titleTimer) {
      clearTimeout(state.autoSave.titleTimer);
    }
    if (state.autoSave.transcriptionTimer) {
      clearTimeout(state.autoSave.transcriptionTimer);
    }
    
    // Hide recorder, show transcription
    recorderContainer.classList.add('hidden');
    transcriptionContainer.classList.remove('hidden');
    
    // Set current recording ID
    state.currentRecordingId = recording.id;
    
    // Update UI with recording data
    transcriptionTitle.textContent = recording.title;
    
    // Format date
    const date = new Date(recording.timestamp);
    transcriptionDate.textContent = date.toLocaleString();
    
    // Set language indicator
    transcriptionLanguage.textContent = recording.language === 'english' ? 'English' : 'Hebrew';
    transcriptionLanguage.className = `language-indicator ${recording.language}`;
    
    // Set transcription text
    transcriptionText.textContent = recording.transcription || '';
    
    // Set audio source if available
    if (recording.audioUrl) {
      audioPlayer.src = recording.audioUrl;
      audioPlayer.classList.remove('hidden');
    } else {
      audioPlayer.classList.add('hidden');
    }
    
    // Render tags
    renderTags(recording.tags || []);
    
    // Show continue recording button
    document.getElementById('continueRecordingBtn').classList.remove('hidden');
    
    // Remove any existing continuation container if present
    const existingContinuationContainer = document.getElementById('continuationContainer');
    if (existingContinuationContainer) {
      existingContinuationContainer.remove();
    }
    
    // Reset related recordings if not in continuation mode
    if (!state.continuationMode) {
      state.relatedRecordings = [];
    }
    
    return true;
  } catch (error) {
    console.error('Error displaying transcription:', error);
    return false;
  }
}

// Save edited title
async function saveEditedTitle() {
  const recordingId = state.currentRecordingId;
  if (!recordingId) return;
  
  const newTitle = transcriptionTitle.textContent.trim();
  if (!newTitle) return;
  
  try {
    // Find the recording in state
    const recordingIndex = state.recordings.findIndex(r => r.id === recordingId);
    if (recordingIndex === -1) return;
    
    // If title hasn't changed, don't update
    if (state.recordings[recordingIndex].title === newTitle) return;
    
    // Show saving indicator
    const titleAutoSaveIndicator = document.querySelector('.title-edit-container .auto-save-indicator');
    if (titleAutoSaveIndicator) {
      titleAutoSaveIndicator.classList.add('saving');
    }
    
    // Update recording in state
    state.recordings[recordingIndex].title = newTitle;
    
    // Update recording on server
    await updateRecordingOnServer({
      id: recordingId,
      title: newTitle
    });
    
    // Update the title in the sidebar
    const sidebarItem = document.querySelector(`.history-item[data-id="${recordingId}"] .history-title`);
    if (sidebarItem) {
      sidebarItem.textContent = newTitle;
    }
    
    // Show success message (only show for manual edits, not auto-saves)
    if (document.activeElement === transcriptionTitle) {
      showNotification('Title updated', 'success', true);
    }
    
    // Hide saving indicator after a short delay
    setTimeout(() => {
      if (titleAutoSaveIndicator) {
        titleAutoSaveIndicator.classList.remove('saving');
      }
    }, 1000);
    
  } catch (error) {
    console.error('Error updating title:', error);
    showNotification('Failed to update title. Please try again.', 'error');
    
    // Hide saving indicator if there was an error
    const titleAutoSaveIndicator = document.querySelector('.title-edit-container .auto-save-indicator');
    if (titleAutoSaveIndicator) {
      titleAutoSaveIndicator.classList.remove('saving');
    }
  }
}

// Save edited transcription
async function saveEditedTranscription() {
  if (!state.currentRecordingId) {
    console.error('No recording selected');
    return;
  }
  
  try {
    const newTranscription = transcriptionText.textContent.trim();
    
    // Find the recording in state
    const recordingIndex = state.recordings.findIndex(r => r.id === state.currentRecordingId);
    if (recordingIndex === -1) {
      throw new Error('Recording not found in state');
    }
    
    // If transcription hasn't changed, don't update
    if (state.recordings[recordingIndex].transcription === newTranscription) return;
    
    // Show saving indicator
    const transcriptionAutoSaveIndicator = document.querySelector('.transcription-auto-save');
    if (transcriptionAutoSaveIndicator) {
      transcriptionAutoSaveIndicator.classList.add('saving');
    }
    
    console.log(`Saving new transcription for recording ID: ${state.currentRecordingId}`);
    
    // Update the transcription
    state.recordings[recordingIndex].transcription = newTranscription;
    
    // Save to server
    await updateRecordingOnServer(state.recordings[recordingIndex]);
    
    // Show notification only if the user is actively editing (not for auto-saves)
    if (document.activeElement === transcriptionText) {
      showNotification('Transcription updated', 'success', true);
    }
    
    // Hide saving indicator after a short delay
    setTimeout(() => {
      if (transcriptionAutoSaveIndicator) {
        transcriptionAutoSaveIndicator.classList.remove('saving');
      }
    }, 1000);
    
  } catch (error) {
    console.error('Error saving transcription:', error);
    showNotification(`Failed to save transcription: ${error.message}`, 'error');
    
    // Hide saving indicator if there was an error
    const transcriptionAutoSaveIndicator = document.querySelector('.transcription-auto-save');
    if (transcriptionAutoSaveIndicator) {
      transcriptionAutoSaveIndicator.classList.remove('saving');
    }
  }
}

// Update recording on server
async function updateRecordingOnServer(recording) {
  try {
    const response = await fetch(`${API_URL}/recording/${recording.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(recording)
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating recording on server:', error);
    throw error;
  }
}

// Add a new tag
async function addTag() {
  if (!state.currentRecordingId) {
    console.error('No recording selected');
    return;
  }
  
  const tagText = newTagInput.value.trim();
  if (!tagText) return;
  
  try {
    // Find the recording in state
    const recordingIndex = state.recordings.findIndex(r => r.id === state.currentRecordingId);
    if (recordingIndex === -1) {
      throw new Error('Recording not found in state');
    }
    
    // Check if tag already exists
    const recording = state.recordings[recordingIndex];
    if (!recording.tags) recording.tags = [];
    
    if (recording.tags.includes(tagText)) {
      showNotification('This tag already exists', 'info');
      return;
    }
    
    // Add the tag
    recording.tags.push(tagText);
    
    // Save to server
    await updateRecordingOnServer(recording);
    
    // Update UI
    renderTags(recording.tags);
    
    // Clear input
    newTagInput.value = '';
    
  } catch (error) {
    console.error('Error adding tag:', error);
    showNotification(`Failed to add tag: ${error.message}`, 'error');
  }
}

// Remove a tag
async function removeTag(tag) {
  if (!state.currentRecordingId) {
    console.error('No recording selected');
    return;
  }
  
  try {
    // Find the recording in state
    const recordingIndex = state.recordings.findIndex(r => r.id === state.currentRecordingId);
    if (recordingIndex === -1) {
      throw new Error('Recording not found in state');
    }
    
    // Remove the tag
    const recording = state.recordings[recordingIndex];
    if (!recording.tags) recording.tags = [];
    
    recording.tags = recording.tags.filter(t => t !== tag);
    
    // Save to server
    await updateRecordingOnServer(recording);
    
    // Update UI
    renderTags(recording.tags);
    
  } catch (error) {
    console.error('Error removing tag:', error);
    showNotification(`Failed to remove tag: ${error.message}`, 'error');
  }
}

// Render tags
function renderTags(tags) {
  if (!tags || tags.length === 0) {
    tagsList.innerHTML = '<div class="empty-tags">No tags yet</div>';
    return;
  }
  
  tagsList.innerHTML = ''; // Clear existing tags
  
  // Create and append each tag element
  tags.forEach(tag => {
    const tagEl = document.createElement('div');
    tagEl.className = 'tag';
    
    // Get the tag color
    const tagColor = state.tagColors.get(tag);
    
    // Apply the tag color if available
    if (tagColor) {
      tagEl.style.backgroundColor = tagColor + '22'; // 13% opacity
      tagEl.style.color = tagColor;
      tagEl.style.borderColor = tagColor;
    }
    
    // Create tag text
    const tagText = document.createElement('span');
    tagText.textContent = tag;
    tagEl.appendChild(tagText);
    
    // Create remove button
    const removeBtn = document.createElement('span');
    removeBtn.className = 'tag-remove';
    removeBtn.setAttribute('data-tag', tag);
    
    const icon = document.createElement('i');
    icon.className = 'fas fa-times';
    removeBtn.appendChild(icon);
    
    // Add click event to remove button
    removeBtn.addEventListener('click', () => removeTag(tag));
    
    tagEl.appendChild(removeBtn);
    tagsList.appendChild(tagEl);
  });
}

// Render calendar
function renderCalendar() {
  const { currentMonth, currentYear } = state.calendar;
  
  // Update calendar title
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  calendarTitle.textContent = `${monthNames[currentMonth]} ${currentYear}`;
  
  // Get first day of month and number of days
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  // Get days from previous month
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
  
  // Create calendar grid
  let html = '';
  
  // Add day headers
  const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  dayHeaders.forEach(day => {
    html += `<div class="calendar-day-header">${day}</div>`;
  });
  
  // Add days from previous month
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    html += `<div class="calendar-day other-month" data-date="${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}">${day}</div>`;
  }
  
  // Add days of current month
  const today = new Date();
  const todayDate = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();
  
  // Get recordings for this month
  const recordingsInMonth = state.recordings.filter(recording => {
    const recordingDate = new Date(recording.timestamp);
    return recordingDate.getMonth() === currentMonth && recordingDate.getFullYear() === currentYear;
  });
  
  // Group recordings by day
  const recordingsByDay = {};
  recordingsInMonth.forEach(recording => {
    const date = new Date(recording.timestamp);
    const day = date.getDate();
    if (!recordingsByDay[day]) {
      recordingsByDay[day] = [];
    }
    recordingsByDay[day].push(recording);
  });
  
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = day === todayDate && currentMonth === todayMonth && currentYear === todayYear;
    const hasRecordings = recordingsByDay[day] && recordingsByDay[day].length > 0;
    
    const classes = [
      'calendar-day',
      isToday ? 'today' : '',
      hasRecordings ? 'has-recordings' : ''
    ].filter(Boolean).join(' ');
    
    const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Create day content - keep it simple to avoid click issues
    let dayContent = `${day}`;
    if (hasRecordings) {
      dayContent += `<span class="red-dot"></span>`;
    }
    
    html += `<div class="${classes}" data-date="${dateString}">${dayContent}</div>`;
  }
  
  // Add days from next month
  const totalCells = 42; // 6 rows of 7 days
  const cellsUsed = firstDay + daysInMonth;
  const cellsRemaining = totalCells - cellsUsed;
  
  for (let day = 1; day <= cellsRemaining; day++) {
    html += `<div class="calendar-day other-month" data-date="${currentYear}-${String(currentMonth + 2).padStart(2, '0')}-${String(day).padStart(2, '0')}">${day}</div>`;
  }
  
  calendarGrid.innerHTML = html;
  
  // Add event listeners to all calendar days
  document.querySelectorAll('.calendar-day').forEach(dayElement => {
    dayElement.addEventListener('click', handleCalendarDayClick);
  });
};

// Handle calendar day click
function handleCalendarDayClick(e) {
  // Prevent default behavior
  e.preventDefault();
  e.stopPropagation();
  
  console.log('Calendar day click event triggered', e.target);
  
  // Get the calendar day element (could be the day itself or a child element like the red dot)
  let dayElement = e.target;
  
  // If clicked on a child element (like the red dot), get the parent calendar day
  if (!dayElement.classList.contains('calendar-day')) {
    dayElement = dayElement.closest('.calendar-day');
    if (!dayElement) {
      console.error('Could not find calendar day element from click event');
      return false; // Exit if no calendar day found
    }
  }
  
  const dateString = dayElement.getAttribute('data-date');
  if (!dateString) {
    console.error('Calendar day is missing data-date attribute');
    return false;
  }
  
  const hasRecordings = dayElement.classList.contains('has-recordings');
  
  console.log('Calendar day clicked:', dateString, 'Has recordings:', hasRecordings);
  
  // Get the popup element
  const dayRecordingsPopup = document.getElementById('dayRecordingsPopup');
  if (!dayRecordingsPopup) {
    console.error('Day recordings popup element not found');
    return false;
  }
  
  // If popup is visible and clicking on the same day, hide it
  if (!dayRecordingsPopup.classList.contains('hidden') && 
      dayRecordingsPopup.getAttribute('data-current-date') === dateString) {
    console.log('Hiding popup for same day');
    dayRecordingsPopup.classList.add('hidden');
    dayRecordingsPopup.style.display = 'none';
    return false; // Exit early after hiding the popup
  }
  // Always hide the current popup first, regardless of what we're going to do next
  dayRecordingsPopup.classList.add('hidden');
  
  // If clicking on a day with recordings, show the popup with new content
  if (hasRecordings) {
    console.log('Showing popup for day with recordings');
    // Show the popup immediately with the new date's recordings
    showDayRecordings(dateString, e);
  } else {
    console.log('No recordings for this day, keeping popup hidden');
    // Ensure the popup stays hidden
    dayRecordingsPopup.style.display = 'none';
  }
  
  return false;
}
// Navigate to previous or next month
function navigateMonth(direction) {
  let { currentMonth, currentYear } = state.calendar;
  
  currentMonth += direction;
  
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  } else if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  
  state.calendar.currentMonth = currentMonth;
  state.calendar.currentYear = currentYear;
  
  renderCalendar();
}

// Show recordings for a specific day
function showDayRecordings(dateString, event) {
  console.log('showDayRecordings called with date:', dateString);
  
  // Parse the date
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Find recordings for this day
  const dayRecordings = state.recordings.filter(recording => {
    const recordingDate = new Date(recording.timestamp);
    return (
      recordingDate.getFullYear() === year &&
      recordingDate.getMonth() === month - 1 &&
      recordingDate.getDate() === day
    );
  });
  
  console.log('Found recordings for this day:', dayRecordings.length);
  if (dayRecordings.length === 0) return;
  
  // Format date for display
  const dateObj = new Date(year, month - 1, day);
  const formattedDate = dateObj.toLocaleDateString(undefined, { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Generate HTML for popup
  let html = `
    <h3 class="day-recordings-title">${formattedDate}</h3>
    <div class="day-recordings-list">
  `;
  
  dayRecordings.forEach(recording => {
    const time = new Date(recording.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    html += `
      <div class="day-recording-item" data-id="${recording.id}">
        <h4>${recording.title}</h4>
        <div class="day-recording-meta">
          <span>${time}</span>
          <span class="language-indicator ${recording.language}">${recording.language === 'hebrew' ? 'Hebrew' : 'English'}</span>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  
  // Get the popup element
  const dayRecordingsPopup = document.getElementById('dayRecordingsPopup');
  if (!dayRecordingsPopup) {
    console.error('Day recordings popup element not found');
    return;
  }
  
  // Show popup
  dayRecordingsPopup.innerHTML = html;
  
  // Add click event listeners to recording items
  const recordingItems = dayRecordingsPopup.querySelectorAll('.day-recording-item');
  recordingItems.forEach(item => {
    item.addEventListener('click', () => {
      const recordingId = item.getAttribute('data-id');
      if (recordingId) {
        fetchRecordingDetails(recordingId);
        dayRecordingsPopup.classList.add('hidden');
      }
    });
  });
  
  // Store current date for reference
  dayRecordingsPopup.setAttribute('data-current-date', dateString);
  
  // Make popup visible
  dayRecordingsPopup.classList.remove('hidden');
  
  // Force browser to recognize the popup is visible
  dayRecordingsPopup.style.display = 'block';
  
  // Add event listener to close popup when clicking outside
  document.addEventListener('click', closePopupOnClickOutside);
  
  console.log('Popup shown successfully');
}

// Function to close popup when clicking outside
function closePopupOnClickOutside(e) {
  const dayRecordingsPopup = document.getElementById('dayRecordingsPopup');
  if (!dayRecordingsPopup || dayRecordingsPopup.classList.contains('hidden')) {
    document.removeEventListener('click', closePopupOnClickOutside);
    return;
  }
  
  // Check if the click was outside the popup
  if (!dayRecordingsPopup.contains(e.target) && !e.target.closest('.calendar-day')) {
    dayRecordingsPopup.classList.add('hidden');
    document.removeEventListener('click', closePopupOnClickOutside);
  }
}

// Continue recording from a previous recording
async function continueRecording() {
  try {
    // Set continuation mode
    state.continuationMode = true;
    
    // If we don't have the current recording ID in related recordings yet, add it
    if (state.currentRecordingId && !state.relatedRecordings.includes(state.currentRecordingId)) {
      state.relatedRecordings.push(state.currentRecordingId);
      
      // Show merge button if we have at least one recording in related recordings
      if (state.relatedRecordings.length > 0) {
        document.getElementById('mergeTranscriptionsBtn').classList.remove('hidden');
      }
    }
    
    // Create a continuation container if it doesn't exist
    let continuationContainer = document.getElementById('continuationContainer');
    if (!continuationContainer) {
      continuationContainer = document.createElement('div');
      continuationContainer.id = 'continuationContainer';
      continuationContainer.className = 'continuation-container';
      
      // Initially hide the container to allow for transition animation
      continuationContainer.style.opacity = '0';
      continuationContainer.style.transform = 'translateY(20px)';
      continuationContainer.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      
      // Create header
      const header = document.createElement('h3');
      header.textContent = 'Continue Recording';
      continuationContainer.appendChild(header);
      
      // Add language selector (similar to original)
      const languageSelector = document.createElement('div');
      languageSelector.className = 'language-selector';
      
      const languageLabel = document.createElement('label');
      languageLabel.textContent = 'Select Language:';
      languageSelector.appendChild(languageLabel);
      
      const languageButtons = document.createElement('div');
      languageButtons.className = 'language-buttons';
      languageButtons.innerHTML = `
        <button id="continuationEnglishBtn" class="language-btn ${state.selectedLanguage === 'english' ? 'active' : ''}" data-language="english">English</button>
        <button id="continuationHebrewBtn" class="language-btn ${state.selectedLanguage === 'hebrew' ? 'active' : ''}" data-language="hebrew">עברית</button>
      `;
      languageSelector.appendChild(languageButtons);
      continuationContainer.appendChild(languageSelector);
      
      // Create recorder controls
      const recorderControls = document.createElement('div');
      recorderControls.className = 'recorder-controls';
      
      // Create record button
      const recordBtn = document.createElement('div');
      recordBtn.className = 'record-button';
      recordBtn.id = 'continuationRecordButton';
      recordBtn.innerHTML = '<i class="fas fa-microphone"></i>';
      recorderControls.appendChild(recordBtn);
      
      // Create status display
      const statusDisplay = document.createElement('div');
      statusDisplay.className = 'recording-status';
      statusDisplay.id = 'continuationRecordingStatus';
      statusDisplay.innerHTML = `
        <span class="status-text">Ready to continue</span>
        <span class="timer" id="continuationTimer">00:00</span>
      `;
      recorderControls.appendChild(statusDisplay);
      
      continuationContainer.appendChild(recorderControls);
      
      // Create action buttons
      const actionBtns = document.createElement('div');
      actionBtns.className = 'action-buttons hidden'; // Start hidden
      actionBtns.id = 'continuationActionButtons';
      
      // Create save button as a separate element
      const saveBtn = document.createElement('button');
      saveBtn.id = 'continuationSaveButton';
      saveBtn.className = 'action-btn save-btn';
      saveBtn.innerHTML = '<i class="fas fa-save"></i> Save';
      
      // Create cancel button as a separate element
      const cancelBtn = document.createElement('button');
      cancelBtn.id = 'continuationCancelButton';
      cancelBtn.className = 'action-btn cancel-btn';
      cancelBtn.innerHTML = '<i class="fas fa-times"></i> Cancel';
      
      // Append buttons to action buttons container
      actionBtns.appendChild(saveBtn);
      actionBtns.appendChild(cancelBtn);
      continuationContainer.appendChild(actionBtns);
      
      // Create processing indicator
      const processingIndicator = document.createElement('div');
      processingIndicator.className = 'processing-indicator hidden'; // Start hidden
      processingIndicator.style.display = 'none'; // Ensure it's completely hidden
      processingIndicator.id = 'continuationProcessingIndicator';
      processingIndicator.innerHTML = `
        <div class="spinner"></div>
        <span>Processing... </span>
        <span id="continuationProcessingTimer">00:00</span>
      `;
      continuationContainer.appendChild(processingIndicator);
      
      // Append to transcription container
      transcriptionContainer.appendChild(continuationContainer);
      
      // Add event listeners
      document.getElementById('continuationRecordButton').addEventListener('click', toggleContinuationRecording);
      document.getElementById('continuationSaveButton').addEventListener('click', saveContinuationRecording);
      document.getElementById('continuationCancelButton').addEventListener('click', cancelContinuationRecording);
      
      // Add language selection event listeners
      document.getElementById('continuationEnglishBtn').addEventListener('click', () => setContinuationLanguage('english'));
      document.getElementById('continuationHebrewBtn').addEventListener('click', () => setContinuationLanguage('hebrew'));
      
      // Trigger animation after a short delay to ensure the DOM has updated
      setTimeout(() => {
        continuationContainer.style.opacity = '1';
        continuationContainer.style.transform = 'translateY(0)';
      }, 10);
      
      // Scroll to the continuation container with smooth animation
      setTimeout(() => {
        continuationContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
    
    // Reset recording state but keep continuation mode
    resetRecordingState(true);
    
    // Show notification
    showNotification('Continue recording mode activated. Select language and click the microphone to start recording.');
    
    return true;
  } catch (error) {
    console.error('Error continuing recording:', error);
    showNotification('Failed to continue recording. Please try again.', 'error');
    return false;
  }
}

// Merge multiple transcriptions into a single document
async function mergeTranscriptions() {
  if (state.relatedRecordings.length <= 1) {
    showNotification('You need at least two recordings to merge.', 'info');
    return;
  }
  
  try {
    // Get all related recordings
    const relatedRecordings = [];
    for (const id of state.relatedRecordings) {
      const recording = state.recordings.find(r => r.id === id);
      if (recording) {
        relatedRecordings.push(recording);
      }
    }
    
    // Sort by timestamp
    relatedRecordings.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Create merged content
    let mergedTitle = 'Merged: ' + relatedRecordings[0].title;
    let mergedTranscription = '';
    let allTags = new Set();
    
    // Combine all transcriptions
    relatedRecordings.forEach(recording => {
      if (recording.transcription) {
        mergedTranscription += recording.transcription + '\n\n';
      }
      
      // Collect all tags
      if (recording.tags && Array.isArray(recording.tags)) {
        recording.tags.forEach(tag => allTags.add(tag));
      }
    });
    
    // Update the current recording with merged content
    const currentRecording = state.recordings.find(r => r.id === state.currentRecordingId);
    if (currentRecording) {
      currentRecording.title = mergedTitle;
      currentRecording.transcription = mergedTranscription.trim();
      currentRecording.tags = Array.from(allTags);
      
      // Update the UI
      transcriptionTitle.textContent = mergedTitle;
      transcriptionText.textContent = mergedTranscription.trim();
      renderTags(currentRecording.tags);
      
      // Save to server
      await updateRecordingOnServer(currentRecording);
      
      // Update the sidebar
      const sidebarItem = document.querySelector(`.history-item[data-id="${currentRecording.id}"] .history-title`);
      if (sidebarItem) {
        sidebarItem.textContent = mergedTitle;
      }
      
      showNotification('Transcriptions merged successfully!');
    }
  } catch (error) {
    console.error('Error merging transcriptions:', error);
    showNotification('Failed to merge transcriptions. Please try again.', 'error');
  }
}

// Show notification
function showNotification(message, type = 'success', isSubtle = false) {
  // Set message and type
  notificationMessage.textContent = message;
  
  // Apply classes based on type and subtlety
  if (isSubtle) {
    notificationBar.className = `notification-bar ${type} subtle`;
  } else {
    notificationBar.className = `notification-bar ${type}`;
  }
  
  // Show notification
  notificationBar.classList.remove('hidden');
  setTimeout(() => {
    notificationBar.classList.add('show');
  }, 10);
  
  // Hide notification after delay (shorter for subtle notifications)
  const displayTime = isSubtle ? 1200 : 2000;
  
  setTimeout(() => {
    notificationBar.classList.remove('show');
    setTimeout(() => {
      notificationBar.classList.add('hidden');
    }, 500);
  }, displayTime);
}

// Toggle continuation recording
function toggleContinuationRecording() {
  if (state.isRecording) {
    // If recording, pause it
    pauseRecording();
    
    // Only show action buttons if we have recorded something
    if (state.audioChunks.length > 0) {
      const continuationActionButtons = document.getElementById('continuationActionButtons');
      if (continuationActionButtons) {
        continuationActionButtons.classList.remove('hidden');
      }
    }
  } else {
    // If not recording, start it
    startRecording();
    
    // Update UI for continuation mode
    const continuationRecordButton = document.getElementById('continuationRecordButton');
    const continuationStatus = document.getElementById('continuationRecordingStatus');
    
    if (continuationRecordButton) {
      continuationRecordButton.classList.add('recording');
    }
    
    if (continuationStatus) {
      const statusText = continuationStatus.querySelector('.status-text');
      if (statusText) {
        statusText.textContent = 'Recording in progress...';
      }
    }
    
    // Hide action buttons when starting a new recording
    const continuationActionButtons = document.getElementById('continuationActionButtons');
    if (continuationActionButtons) {
      continuationActionButtons.classList.add('hidden');
    }
    
    // Hide processing indicator when starting a new recording
    const continuationProcessingIndicator = document.getElementById('continuationProcessingIndicator');
    if (continuationProcessingIndicator) {
      continuationProcessingIndicator.classList.add('hidden');
    }
  }
}

// Set continuation language
function setContinuationLanguage(language) {
  // Update state
  state.selectedLanguage = language;
  
  // Update UI
  const englishBtn = document.getElementById('continuationEnglishBtn');
  const hebrewBtn = document.getElementById('continuationHebrewBtn');
  
  if (englishBtn && hebrewBtn) {
    if (language === 'english') {
      englishBtn.classList.add('active');
      hebrewBtn.classList.remove('active');
    } else {
      englishBtn.classList.remove('active');
      hebrewBtn.classList.add('active');
    }
  }
  
  // Show notification
  showNotification(`Language set to ${language === 'english' ? 'English' : 'Hebrew'}`);
}



// Save continuation recording
async function saveContinuationRecording() {
  // If still recording, stop it first
  if (state.isRecording) {
    stopRecording();
  }
  
  if (state.audioChunks.length === 0) {
    return;
  }
  
  // Hide continuation action buttons
  const continuationActionButtons = document.getElementById('continuationActionButtons');
  if (continuationActionButtons) {
    continuationActionButtons.classList.add('hidden');
  }
  
  // Show continuation processing indicator
  const continuationProcessingIndicator = document.getElementById('continuationProcessingIndicator');
  if (continuationProcessingIndicator) {
    continuationProcessingIndicator.classList.remove('hidden');
    continuationProcessingIndicator.style.display = 'flex'; // Ensure it's visible
  }
  
  // Start processing timer
  state.processingStartTime = Date.now();
  state.processingInterval = setInterval(updateProcessingTimer, 1000);
  
  // Create audio blob
  const audioBlob = new Blob(state.audioChunks, { type: 'audio/webm' });
  
  // Create form data
  const formData = new FormData();
  formData.append('audio', audioBlob);
  formData.append('language', state.selectedLanguage);
  formData.append('continuationMode', 'true');
  formData.append('recordingId', state.currentRecordingId);
  
  try {
    // Send to server
    const response = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Server error');
    }
    
    const result = await response.json();
    
    // Clear processing timer
    clearInterval(state.processingInterval);
    
    // Hide continuation processing indicator
    if (continuationProcessingIndicator) {
      continuationProcessingIndicator.classList.add('hidden');
      continuationProcessingIndicator.style.display = 'none'; // Ensure it's completely hidden
    }
    
    // Find the current recording
    const currentRecording = state.recordings.find(r => r.id === state.currentRecordingId);
    
    if (currentRecording) {
      // Update the recording with the new transcription appended
      currentRecording.transcription = `${currentRecording.transcription}\n\n${result.transcription}`;
      
      // Update the UI
      transcriptionText.textContent = currentRecording.transcription;
      
      // Update the recording on the server
      await updateRecordingOnServer(currentRecording);
      
      // Show success notification
      showNotification('Recording continued and transcription appended successfully!');
      
      // Reset continuation mode
      state.continuationMode = false;
      
      // Remove continuation container if it exists
      const continuationContainer = document.getElementById('continuationContainer');
      if (continuationContainer) {
        continuationContainer.remove();
      }
      
      // Reset recording state
      resetRecordingState();
      
      // Refresh recordings list to update UI
      await fetchRecordings();
    } else {
      // If the current recording wasn't found, show an error
      showNotification('Failed to find the current recording. Please try again.', 'error');
      
      // Reset recording state
      resetRecordingState();
    }
  } catch (error) {
    console.error('Error saving continuation recording:', error);
    showNotification('Failed to process recording. Please try again.', 'error');
    
    // Clear processing timer
    clearInterval(state.processingInterval);
    
    // Hide continuation processing indicator
    if (continuationProcessingIndicator) {
      continuationProcessingIndicator.classList.add('hidden');
      continuationProcessingIndicator.style.display = 'none'; // Ensure it's completely hidden
    }
    
    // Reset recording state
    resetRecordingState();
  }
}

// Cancel continuation recording
function cancelContinuationRecording() {
  // Stop recording if it's in progress
  if (state.isRecording) {
    stopRecording();
  }
  
  // Reset recording state
  resetRecordingState();
  
  // Hide continuation action buttons
  const continuationActionButtons = document.getElementById('continuationActionButtons');
  if (continuationActionButtons) {
    continuationActionButtons.classList.add('hidden');
  }
  
  // Remove continuation container with animation
  const continuationContainer = document.getElementById('continuationContainer');
  if (continuationContainer) {
    // Fade out animation
    continuationContainer.style.opacity = '0';
    continuationContainer.style.transform = 'translateY(20px)';
    
    // Remove after animation completes
    setTimeout(() => {
      continuationContainer.remove();
    }, 500);
  }
  
  // Reset continuation mode
  state.continuationMode = false;
  
  // Show notification
  showNotification('Recording cancelled');
}

// Show delete confirmation dialog
function showDeleteConfirmation() {
  if (!state.currentRecordingId) {
    showNotification('No recording selected', 'error');
    return;
  }
  
  // Show confirmation dialog
  confirmationDialog.classList.remove('hidden');
}

// Hide delete confirmation dialog
function hideDeleteConfirmation() {
  confirmationDialog.classList.add('hidden');
}

// Go to home screen (recorder view)
function goToHomeScreen() {
  // Hide transcription container if visible
  transcriptionContainer.classList.add('hidden');
  
  // Show recorder container
  recorderContainer.classList.remove('hidden');
  
  // Reset continuation mode and related recordings
  state.continuationMode = false;
  state.relatedRecordings = [];
  
  // Hide merge button
  document.getElementById('mergeTranscriptionsBtn').classList.add('hidden');
  
  // Hide any continuation container if visible
  const continuationContainer = document.getElementById('continuationContainer');
  if (continuationContainer) {
    continuationContainer.remove();
  }
  
  // Reset current recording ID
  state.currentRecordingId = null;
}

// Delete recording
async function deleteRecording() {
  if (!state.currentRecordingId) {
    showNotification('No recording selected', 'error');
    hideDeleteConfirmation();
    return;
  }
  
  try {
    // Send delete request to server
    const response = await fetch(`${API_URL}/recording/${state.currentRecordingId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }
    
    // Remove from state
    state.recordings = state.recordings.filter(r => r.id !== state.currentRecordingId);
    
    // Hide confirmation dialog
    hideDeleteConfirmation();
    
    // Show success notification
    showNotification('Recording deleted successfully');
    
    // Go back to recorder view
    transcriptionContainer.classList.add('hidden');
    recorderContainer.classList.remove('hidden');
    
    // Reset current recording ID
    state.currentRecordingId = null;
    
    // Update UI
    renderRecordingsList();
    renderCalendar();
    
  } catch (error) {
    console.error('Error deleting recording:', error);
    showNotification(`Failed to delete recording: ${error.message}`, 'error');
    hideDeleteConfirmation();
  }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', initApp);
