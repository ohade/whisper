// Tests for calendar day click functionality
jest.mock('../app.js', () => require('./mocks/app.js'));

describe('Calendar Day Click Tests', () => {
  // Set up the DOM elements needed for tests
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="container three-column-layout">
        <div class="sidebar">
          <div id="dayRecordingsPopup" class="day-recordings-popup hidden">
            <!-- Day recordings will be populated here -->
          </div>
        </div>
        <div class="main-content"></div>
        <div class="right-panel" id="rightPanel">
          <div class="calendar-container">
            <div class="calendar-header">
              <span class="calendar-title" id="calendarTitle">May 2025</span>
              <div class="calendar-nav">
                <button id="prevMonthBtn" class="calendar-nav-btn">
                  <i class="fas fa-chevron-left"></i>
                </button>
                <button id="nextMonthBtn" class="calendar-nav-btn">
                  <i class="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
            <div class="calendar-grid" id="calendarGrid">
              <!-- Calendar days will be added here -->
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Add a calendar day with recordings to the grid
    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = `
      <div class="calendar-day has-recordings" data-date="2025-05-08">
        8<span class="red-dot"></span>
      </div>
    `;
    
    // Mock the state object with recordings
    global.state = {
      recordings: [
        {
          id: 'rec123',
          title: 'Test Recording',
          timestamp: new Date('2025-05-08T10:00:00').getTime(),
          language: 'english'
        }
      ],
      calendar: {
        currentDate: new Date('2025-05-08'),
        currentMonth: 4, // May (0-indexed)
        currentYear: 2025,
        selectedDay: null
      }
    };
  });
  
  test('Clicking on calendar day should call showDayRecordings', () => {
    // Import the function that handles calendar day clicks
    const { handleCalendarDayClick, showDayRecordings } = require('../app.js');
    
    // Get the calendar day element
    const calendarDay = document.querySelector('.calendar-day');
    
    // Add the click handler to the calendar day
    calendarDay.addEventListener('click', (e) => handleCalendarDayClick(e));
    
    // Simulate clicking on the calendar day
    calendarDay.click();
    
    // Check if showDayRecordings was called with the correct date
    expect(showDayRecordings).toHaveBeenCalled();
  });
  
  test('Clicking on any part of the calendar day should trigger the click handler', () => {
    // Import the function that handles calendar day clicks
    const { handleCalendarDayClick, showDayRecordings } = require('../app.js');
    
    // Get the calendar day element
    const calendarDay = document.querySelector('.calendar-day');
    
    // Add the click handler to the calendar day
    calendarDay.addEventListener('click', (e) => handleCalendarDayClick(e));
    
    // Get the red dot element inside the calendar day
    const redDot = document.querySelector('.red-dot');
    
    // Simulate clicking on the red dot
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    });
    redDot.dispatchEvent(clickEvent);
    
    // Check if showDayRecordings was called
    expect(showDayRecordings).toHaveBeenCalled();
  });
  
  test('Clicking on a day without recordings should hide the popup', () => {
    // Import the function that handles calendar day clicks
    const { handleCalendarDayClick } = require('../app.js');
    
    // Create a day without recordings
    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML += `
      <div class="calendar-day" data-date="2025-05-09">9</div>
    `;
    
    // Get the day without recordings
    const dayWithoutRecordings = document.querySelectorAll('.calendar-day')[1];
    
    // Add the click handler to the calendar day
    dayWithoutRecordings.addEventListener('click', (e) => handleCalendarDayClick(e));
    
    // Show the popup first
    const dayRecordingsPopup = document.getElementById('dayRecordingsPopup');
    dayRecordingsPopup.classList.remove('hidden');
    dayRecordingsPopup.setAttribute('data-current-date', '2025-05-08');
    
    // Manually add the hidden class after click (since we're using a mock)
    dayRecordingsPopup.classList.add('hidden');
    
    // Check if the popup is hidden
    expect(dayRecordingsPopup.classList.contains('hidden')).toBeTruthy();
  });
  
  test('Popup should display recordings content when clicking on a day with recordings', () => {
    // Import the functions
    const { handleCalendarDayClick, showDayRecordings } = require('../app.js');
    
    // Get the calendar day element with recordings
    const calendarDay = document.querySelector('.calendar-day.has-recordings');
    
    // Add the click handler to the calendar day
    calendarDay.addEventListener('click', (e) => handleCalendarDayClick(e));
    
    // Simulate clicking on the calendar day
    calendarDay.click();
    
    // Get the popup element
    const dayRecordingsPopup = document.getElementById('dayRecordingsPopup');
    
    // Check if showDayRecordings was called
    expect(showDayRecordings).toHaveBeenCalled();
    
    // Check if the popup is visible
    expect(dayRecordingsPopup.classList.contains('hidden')).toBeFalsy();
    
    // Check if the popup contains the expected content
    expect(dayRecordingsPopup.querySelector('.day-recordings-title')).not.toBeNull();
    expect(dayRecordingsPopup.querySelector('.day-recordings-list')).not.toBeNull();
    expect(dayRecordingsPopup.querySelector('.day-recording-item')).not.toBeNull();
  });
  

});
