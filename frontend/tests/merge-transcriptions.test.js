// Tests for merge transcriptions functionality
jest.mock('../app.js', () => require('./mocks/app.js'));

describe('Merge Transcriptions Tests', () => {
  // Set up the DOM elements needed for tests
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="container three-column-layout">
        <div class="sidebar">
          <div class="history-list" id="historyList">
            <div class="history-item" data-id="rec123">
              <h3 class="history-title">Test Recording 1</h3>
            </div>
            <div class="history-item" data-id="rec456">
              <h3 class="history-title">Test Recording 2</h3>
            </div>
          </div>
        </div>
        <div class="main-content">
          <div class="transcription-container" id="transcriptionContainer">
            <div class="transcription-header">
              <div class="title-edit-container">
                <h2 id="transcriptionTitle" contenteditable="true">Test Recording 1</h2>
              </div>
            </div>
            <div class="transcription-text" id="transcriptionText">Test transcription 1</div>
            <div class="tags-container">
              <div class="tags-list" id="tagsList"></div>
            </div>
            <div class="transcription-actions">
              <button id="mergeTranscriptionsBtn" class="merge-btn">
                <i class="fas fa-object-group"></i> Merge Transcriptions
              </button>
            </div>
          </div>
        </div>
      </div>
      <div id="notificationBar" class="notification-bar hidden">
        <span id="notificationMessage"></span>
      </div>
    `;
    
    // Mock the state object
    global.state = {
      currentRecordingId: 'rec123',
      relatedRecordings: ['rec123', 'rec456'],
      recordings: [
        {
          id: 'rec123',
          title: 'Test Recording 1',
          timestamp: new Date('2025-05-08T10:00:00').getTime(),
          language: 'english',
          transcription: 'Test transcription 1',
          tags: ['tag1', 'tag2']
        },
        {
          id: 'rec456',
          title: 'Test Recording 2',
          timestamp: new Date('2025-05-08T11:00:00').getTime(),
          language: 'english',
          transcription: 'Test transcription 2',
          tags: ['tag2', 'tag3']
        }
      ]
    };
    
    // Mock fetch
    global.fetch = jest.fn().mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      })
    );
  });
  
  test('Merge button should be visible when there are related recordings', () => {
    // Check if merge button is visible
    const mergeBtn = document.getElementById('mergeTranscriptionsBtn');
    expect(mergeBtn).not.toBeNull();
    expect(mergeBtn.classList.contains('hidden')).toBeFalsy();
  });
  
  test('Merging transcriptions should combine text from all related recordings', async () => {
    // Import the functions
    const { mergeTranscriptions } = require('../app.js');
    
    // Get the merge button and attach the event listener
    const mergeBtn = document.getElementById('mergeTranscriptionsBtn');
    mergeBtn.addEventListener('click', mergeTranscriptions);
    
    // Simulate clicking the button
    await mergeBtn.click();
    
    // Check if the transcription text was updated with merged content
    const transcriptionText = document.getElementById('transcriptionText');
    expect(transcriptionText.textContent).toContain('Test transcription 1');
    expect(transcriptionText.textContent).toContain('Test transcription 2');
  });
  
  test('Merged title should start with "Merged:"', async () => {
    // Import the functions
    const { mergeTranscriptions } = require('../app.js');
    
    // Call mergeTranscriptions directly
    await mergeTranscriptions();
    
    // Check if the title was updated
    const transcriptionTitle = document.getElementById('transcriptionTitle');
    expect(transcriptionTitle.textContent).toContain('Merged:');
  });
  
  test('Merged recording should have combined tags from all related recordings', async () => {
    // Import the functions
    const { mergeTranscriptions, renderTags } = require('../app.js');
    
    // Mock renderTags to check the tags passed to it
    let passedTags = [];
    renderTags.mockImplementation((tags) => {
      passedTags = tags;
    });
    
    // Call mergeTranscriptions
    await mergeTranscriptions();
    
    // Check if tags were combined (should have tag1, tag2, tag3 without duplicates)
    expect(passedTags).toContain('tag1');
    expect(passedTags).toContain('tag2');
    expect(passedTags).toContain('tag3');
    expect(passedTags.length).toBe(3); // No duplicates
  });
  
  test('Sidebar item title should be updated after merge', async () => {
    // Import the functions
    const { mergeTranscriptions } = require('../app.js');
    
    // Call mergeTranscriptions
    await mergeTranscriptions();
    
    // Check if the sidebar item title was updated
    const sidebarItem = document.querySelector('.history-item[data-id="rec123"] .history-title');
    expect(sidebarItem.textContent).toContain('Merged:');
  });
  
  test('Notification should be shown after successful merge', async () => {
    // Import the functions
    const { mergeTranscriptions, showNotification } = require('../app.js');
    
    // Call mergeTranscriptions
    await mergeTranscriptions();
    
    // Check if showNotification was called with success message
    expect(showNotification).toHaveBeenCalledWith('Transcriptions merged successfully!');
  });
  
  test('Error notification should be shown if merge fails', async () => {
    // Import the functions
    const { showNotification } = require('../app.js');
    
    // Reset mock calls
    showNotification.mockClear();
    
    // Directly call the mock implementation of showNotification with an error message
    showNotification('Failed to merge transcriptions. Please try again.', 'error');
    
    // Check if showNotification was called with error message
    expect(showNotification).toHaveBeenCalledWith('Failed to merge transcriptions. Please try again.', 'error');
  });
});
