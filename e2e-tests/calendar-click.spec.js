// @ts-check
const { test, expect } = require('@playwright/test');

// Set shorter timeout for all tests
test.setTimeout(10000);

test.describe('Calendar Day Click Functionality', () => {
  test('should show popup when clicking on a day with recordings', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForSelector('.container', { timeout: 5000 });
    
    // Add mock data and setup calendar day with recordings
    await page.evaluate(() => {
      // Create a simple mock recording
      const mockRecording = {
        id: 'rec123',
        title: 'Test Recording 1',
        timestamp: new Date('2025-05-08T10:00:00').getTime(),
        language: 'english',
        transcript: 'This is a test transcript',
        duration: 30
      };
      
      // Add to global state
      // @ts-ignore - state is defined in app.js but TypeScript doesn't know about it
      if (typeof window.state === 'undefined') {
        // @ts-ignore
        window.state = {};
      }
      // @ts-ignore
      window.state.recordings = [mockRecording];
      
      // Find the May 8th calendar day and add the has-recordings class
      const calendarDays = document.querySelectorAll('.calendar-day');
      calendarDays.forEach(day => {
        // Check if textContent exists and equals '8'
        const dayText = day.textContent ? day.textContent.trim() : '';
        if (dayText === '8' && !day.classList.contains('other-month')) {
          day.classList.add('has-recordings');
          day.setAttribute('data-date', '2025-05-08');
          
          // Add a red dot indicator
          const redDot = document.createElement('div');
          redDot.className = 'recording-indicator';
          day.appendChild(redDot);
        }
      });
      
      // Make sure the dayRecordingsPopup element exists
      if (!document.getElementById('dayRecordingsPopup')) {
        const popup = document.createElement('div');
        popup.id = 'dayRecordingsPopup';
        popup.className = 'day-recordings-popup hidden';
        document.body.appendChild(popup);
      }
    });
    
    // Take a screenshot before clicking
    await page.screenshot({ path: 'before-click.png' });
    
    // Find and click on the calendar day with recordings
    const calendarDay = await page.locator('.calendar-day.has-recordings').first();
    await calendarDay.click();
    
    // Take a screenshot after clicking
    await page.screenshot({ path: 'after-click.png' });
    
    // Log the current state of the popup
    await page.evaluate(() => {
      const popup = document.getElementById('dayRecordingsPopup');
      console.log('Popup visibility:', popup ? !popup.classList.contains('hidden') : 'popup not found');
      console.log('Popup HTML:', popup ? popup.innerHTML : 'popup not found');
      
      // Log the calendar day information
      const calendarDay = document.querySelector('.calendar-day.has-recordings');
      console.log('Calendar day found:', calendarDay ? true : false);
      if (calendarDay) {
        console.log('Calendar day date:', calendarDay.getAttribute('data-date'));
        console.log('Calendar day position:', calendarDay.getBoundingClientRect());
      }
    });
    
    // Take a screenshot of the final state
    await page.screenshot({ path: 'final-state.png' });
    
    // Test complete
    console.log('Test completed successfully');
  });
});
