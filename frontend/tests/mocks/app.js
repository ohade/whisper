// Mock implementation of app.js functions for testing
const renderCalendar = jest.fn();

const moveCalendarToRightPanel = jest.fn().mockImplementation(() => {
  // Call renderCalendar when moveCalendarToRightPanel is called
  renderCalendar();
  return true;
});

const showDayRecordings = jest.fn((dateString, event) => {
  const dayRecordingsPopup = document.getElementById('dayRecordingsPopup');
  if (dayRecordingsPopup) {
    // Parse the date
    const [year, month, day] = dateString.split('-').map(Number);
    
    // Mock recordings for this day
    const mockRecordings = [
      {
        id: 'rec123',
        title: 'Test Recording',
        timestamp: new Date(year, month - 1, day, 10, 0, 0).getTime(),
        language: 'english'
      }
    ];
    
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
    
    mockRecordings.forEach(recording => {
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
    
    // Show popup
    dayRecordingsPopup.innerHTML = html;
    dayRecordingsPopup.classList.remove('hidden');
    
    // Store current date for reference
    dayRecordingsPopup.setAttribute('data-current-date', dateString);
  }
});

const handleCalendarDayClick = jest.fn((e) => {
  // Prevent default behavior
  e.preventDefault();
  e.stopPropagation();
  
  // Get the calendar day element (could be the day itself or a child element like the red dot)
  let dayElement = e.target;
  
  // If clicked on a child element (like the red dot), get the parent calendar day
  if (!dayElement.classList.contains('calendar-day')) {
    dayElement = dayElement.closest('.calendar-day');
    if (!dayElement) return false; // Exit if no calendar day found
  }
  
  const dateString = dayElement.getAttribute('data-date');
  const hasRecordings = dayElement.classList.contains('has-recordings');
  
  // If popup is visible and clicking on the same day, hide it
  const dayRecordingsPopup = document.getElementById('dayRecordingsPopup');
  if (!dayRecordingsPopup.classList.contains('hidden') && 
      dayRecordingsPopup.getAttribute('data-current-date') === dateString) {
    dayRecordingsPopup.classList.add('hidden');
  }
  // If clicking on a day with recordings, show the popup
  else if (hasRecordings) {
    showDayRecordings(dateString, e);
  }
  // If clicking on a day without recordings, hide any visible popup
  else {
    dayRecordingsPopup.classList.add('hidden');
  }
  
  return false;
});

// Mock functions for continuing recordings feature
const displayTranscription = jest.fn((recording) => {
  // Update UI elements with recording data
  const transcriptionTitle = document.getElementById('transcriptionTitle');
  const transcriptionText = document.getElementById('transcriptionText');
  const continueRecordingBtn = document.getElementById('continueRecordingBtn');
  
  if (transcriptionTitle) transcriptionTitle.textContent = recording.title;
  if (transcriptionText) transcriptionText.textContent = recording.transcription;
  
  // Make sure the continue recording button is visible
  if (continueRecordingBtn) continueRecordingBtn.classList.remove('hidden');
  
  // Update state
  global.state.currentRecordingId = recording.id;
  
  // Set the language based on the recording
  if (recording.language) {
    global.state.selectedLanguage = recording.language;
  }
});

const continueRecording = jest.fn(async () => {
  // Set continuation mode
  global.state.continuationMode = true;
  
  // If we don't have the current recording ID in related recordings yet, add it
  if (global.state.currentRecordingId && !global.state.relatedRecordings.includes(global.state.currentRecordingId)) {
    global.state.relatedRecordings.push(global.state.currentRecordingId);
    
    // Show merge button if we have at least one recording in related recordings
    const mergeBtn = document.getElementById('mergeTranscriptionsBtn');
    if (mergeBtn && global.state.relatedRecordings.length > 0) {
      mergeBtn.classList.remove('hidden');
    }
  }
  
  // Create a continuation container if it doesn't exist
  let continuationContainer = document.getElementById('continuationContainer');
  if (!continuationContainer) {
    continuationContainer = document.createElement('div');
    continuationContainer.id = 'continuationContainer';
    continuationContainer.className = 'continuation-container';
    
    // Create header
    const header = document.createElement('h3');
    header.textContent = 'Continue Recording';
    continuationContainer.appendChild(header);
    
    // Add language selection
    const languageSelection = document.createElement('div');
    languageSelection.className = 'language-selection';
    languageSelection.innerHTML = `
      <button class="language-btn ${global.state.selectedLanguage === 'english' ? 'active' : ''}" data-language="english">English</button>
      <button class="language-btn ${global.state.selectedLanguage === 'hebrew' ? 'active' : ''}" data-language="hebrew">עברית</button>
    `;
    continuationContainer.appendChild(languageSelection);
    
    // Create recorder controls
    const recorderControls = document.createElement('div');
    recorderControls.className = 'recorder-controls';
    
    // Create record button
    const recordBtn = document.createElement('div');
    recordBtn.className = 'record-button continuation-record-btn';
    recordBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    recorderControls.appendChild(recordBtn);
    
    // Create status display
    const statusDisplay = document.createElement('div');
    statusDisplay.className = 'recording-status';
    statusDisplay.innerHTML = `
      <span class="status-text">Ready to continue</span>
      <span class="timer" id="continuationTimer">00:00</span>
    `;
    recorderControls.appendChild(statusDisplay);
    
    continuationContainer.appendChild(recorderControls);
    
    // Create action buttons
    const actionBtns = document.createElement('div');
    actionBtns.className = 'action-buttons hidden';
    actionBtns.id = 'continuationActionButtons';
    actionBtns.innerHTML = `
      <button id="continuationSaveBtn" class="action-btn save-btn">
        <i class="fas fa-save"></i> Save
      </button>
      <button id="continuationCancelBtn" class="action-btn cancel-btn">
        <i class="fas fa-times"></i> Cancel
      </button>
    `;
    continuationContainer.appendChild(actionBtns);
    
    // Append to transcription container
    const transcriptionContainer = document.getElementById('transcriptionContainer');
    if (transcriptionContainer) {
      transcriptionContainer.appendChild(continuationContainer);
    }
  }
  
  // Scroll to the continuation container
  if (continuationContainer && continuationContainer.scrollIntoView) {
    continuationContainer.scrollIntoView({ behavior: 'smooth' });
  }
});

const renderTags = jest.fn((tags) => {
  // Mock implementation for rendering tags
  const tagsList = document.getElementById('tagsList');
  if (tagsList) {
    tagsList.innerHTML = '';
    tags.forEach(tag => {
      const tagElement = document.createElement('span');
      tagElement.className = 'tag';
      tagElement.textContent = tag;
      tagsList.appendChild(tagElement);
    });
  }
});

const showNotification = jest.fn((message, type = 'success') => {
  // Mock implementation for showing notifications
  const notificationBar = document.getElementById('notificationBar');
  const notificationMessage = document.getElementById('notificationMessage');
  
  if (notificationBar && notificationMessage) {
    notificationMessage.textContent = message;
    notificationBar.className = `notification-bar ${type}`;
    notificationBar.classList.remove('hidden');
  }
});

const mergeTranscriptions = jest.fn(async () => {
  try {
    // Get related recordings
    const relatedRecordings = [];
    for (const recordingId of global.state.relatedRecordings) {
      const recording = global.state.recordings.find(r => r.id === recordingId);
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
    const currentRecording = global.state.recordings.find(r => r.id === global.state.currentRecordingId);
    if (currentRecording) {
      currentRecording.title = mergedTitle;
      currentRecording.transcription = mergedTranscription.trim();
      currentRecording.tags = Array.from(allTags);
      
      // Update the UI
      const transcriptionTitle = document.getElementById('transcriptionTitle');
      const transcriptionText = document.getElementById('transcriptionText');
      
      if (transcriptionTitle) transcriptionTitle.textContent = mergedTitle;
      if (transcriptionText) transcriptionText.textContent = mergedTranscription.trim();
      
      renderTags(currentRecording.tags);
      
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
});

const saveRecording = jest.fn(async () => {
  if (global.state.audioChunks.length === 0) {
    return Promise.resolve();
  }
  
  try {
    // Check if we're in continuation mode
    if (global.state.continuationMode && global.state.currentRecordingId) {
      // Get the current recording
      const currentRecording = global.state.recordings.find(r => r.id === global.state.currentRecordingId);
      
      if (currentRecording) {
        // Simulate API response with additional transcription
        const apiResponse = {
          id: currentRecording.id,
          title: currentRecording.title,
          timestamp: currentRecording.timestamp,
          language: global.state.selectedLanguage,
          transcription: 'Additional transcription'
        };
        
        // Append the new transcription to the existing one
        currentRecording.transcription = `${currentRecording.transcription}\n\n${apiResponse.transcription}`;
        
        // Update the UI
        const transcriptionText = document.getElementById('transcriptionText');
        if (transcriptionText) {
          transcriptionText.textContent = currentRecording.transcription;
        }
        
        return Promise.resolve(currentRecording);
      }
    } else {
      // If not in continuation mode, create a new recording
      const newRecording = {
        id: `rec${Date.now()}`,
        title: 'New Recording',
        timestamp: Date.now(),
        language: global.state.selectedLanguage,
        transcription: 'Test transcription'
      };
      
      // Add to recordings
      global.state.recordings.push(newRecording);
      
      return Promise.resolve(newRecording);
    }
  } catch (error) {
    console.error('Error saving recording:', error);
    return Promise.reject(error);
  }
});

const setLanguage = jest.fn((language) => {
  global.state.selectedLanguage = language;
});

module.exports = {
  moveCalendarToRightPanel,
  renderCalendar,
  handleCalendarDayClick,
  showDayRecordings,
  displayTranscription,
  continueRecording,
  renderTags,
  showNotification,
  mergeTranscriptions,
  saveRecording,
  setLanguage
};
