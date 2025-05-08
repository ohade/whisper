# Voice Recorder and Transcriber

A web-based application that allows users to record audio in Hebrew or English, save recordings locally, and transcribe them using OpenAI's Whisper model.

## Features

- Record audio in Hebrew or English
- Save recordings locally
- Transcribe recordings using OpenAI's Whisper model
- Generate titles for recordings using OpenAI's GPT model
- View history of recordings with their transcriptions
- Play back recorded audio
- Calendar view showing recording dates with indicators
- Tag system for organizing recordings
- Continue recording functionality to add to existing transcriptions
- Merge multiple transcriptions into a single document
- Non-intrusive notification system
- Responsive three-column layout design

## Prerequisites

- Node.js (v14 or higher)
- npm
- OpenAI API key

## Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file in the root directory with the following content:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=3000
   ```
   Replace `your_openai_api_key_here` with your actual OpenAI API key.

## Usage

1. Start the server:
   ```
   node backend/server.js
   ```
2. Open your browser and navigate to `http://localhost:3000`
3. Select a language (English or Hebrew)
4. Click the microphone button to start recording
5. Click "Save" to save the recording and transcribe it, or "Cancel" to discard it
6. View the transcription result
7. Access previous recordings from the history panel on the left

## Project Structure

- `frontend/` - Contains all frontend files (HTML, CSS, JavaScript)
  - `app.js` - Main application logic
  - `index.html` - Main application HTML
  - `styles.css` - Main application styles
  - `tags.html` & `tags.js` - Tag filtering interface
  - `tests/` - Frontend unit tests
- `backend/` - Contains the Node.js server code
  - `server.js` - Express server implementation
  - `server.test.js` - Server tests
- `e2e-tests/` - End-to-end tests using Playwright
- `uploads/` - Temporary storage for uploaded audio files (not included in repo)
- `recordings/` - Storage for processed recordings and metadata (not included in repo)
- `memory-bank/` - Project documentation and progress tracking
- `track-work.md` - Task tracking with completion status

## Technologies Used

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- APIs: OpenAI Whisper for transcription, OpenAI GPT for title generation
- Audio Recording: Web Audio API and MediaRecorder API
- Testing: Jest for unit tests, Playwright for end-to-end testing
- UI: Material Design principles for components
- Storage: Local file system for recordings and metadata

## Testing

### Unit Tests

Run unit tests with Jest:

```
npm test
```

### End-to-End Tests

Run Playwright tests:

```
npm run test:e2e
```

The E2E tests use mocking to avoid microphone permission prompts and validate key functionality like:
- Recording creation and display
- Calendar functionality and red dot indicators
- Popup menu display and interaction
- Tag filtering
