/**
 * Meeting Summary Feature Tests
 * 
 * Tests for the meeting summary generation functionality
 */

// Import necessary modules
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// Mock fetch API
global.fetch = jest.fn();

// Set up DOM environment
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const dom = new JSDOM(html);
global.document = dom.window.document;
global.window = dom.window;

// Mock OpenAI API response
const mockSummaryResponse = {
  choices: [
    {
      message: {
        content: `## Meeting Summary
- Discussed Q2 marketing strategy
- Agreed on budget allocation for new campaign
- Assigned tasks to team members

## Action Items
1. John to prepare marketing materials by Friday
2. Sarah to contact external partners
3. Team to reconvene next Tuesday for progress update`
      }
    }
  ]
};

// Import app.js (assuming it exports the functions we need)
const app = require('../app');

describe('Meeting Summary Feature', () => {
  beforeEach(() => {
    // Reset mocks
    fetch.mockReset();
    
    // Mock successful API response
    fetch.mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSummaryResponse)
      })
    );
    
    // Set up DOM elements
    document.body.innerHTML = html;
    
    // Mock recording data
    global.state = {
      currentRecordingId: '12345',
      recordings: [
        {
          id: '12345',
          title: 'Test Meeting',
          transcription: 'This is a test meeting transcription with some content to summarize.',
          timestamp: new Date().toISOString()
        }
      ]
    };
  });
  
  test('generateMeetingSummary should call OpenAI API with correct parameters', async () => {
    // Arrange
    const meetingInfo = {
      description: 'Weekly team meeting',
      participants: 'John, Sarah, Mike'
    };
    
    // Act
    await app.generateMeetingSummary(meetingInfo);
    
    // Assert
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/generate-summary'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: expect.stringContaining(meetingInfo.description),
    });
  });
  
  test('saveMeetingSummary should update recording metadata', async () => {
    // Arrange
    const summary = '## Meeting Summary\n- Point 1\n- Point 2';
    const updateSpy = jest.spyOn(app, 'updateRecordingOnServer');
    
    // Act
    await app.saveMeetingSummary(summary);
    
    // Assert
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({
      id: '12345',
      meetingSummary: summary
    }));
  });
  
  test('showMeetingSummaryDialog should display dialog with correct elements', () => {
    // Act
    app.showMeetingSummaryDialog();
    
    // Assert
    const dialog = document.getElementById('meetingSummaryDialog');
    expect(dialog.classList.contains('hidden')).toBe(false);
    
    const descriptionInput = document.getElementById('meetingDescription');
    const participantsInput = document.getElementById('meetingParticipants');
    
    expect(descriptionInput).not.toBeNull();
    expect(participantsInput).not.toBeNull();
  });
  
  test('displayMeetingSummary should render summary in the UI', () => {
    // Arrange
    const summary = '## Meeting Summary\n- Point 1\n- Point 2';
    
    // Act
    app.displayMeetingSummary(summary);
    
    // Assert
    const summaryContainer = document.getElementById('meetingSummaryContainer');
    expect(summaryContainer.classList.contains('hidden')).toBe(false);
    
    const summaryContent = document.getElementById('meetingSummaryContent');
    expect(summaryContent.innerHTML).toContain(summary);
  });
});
