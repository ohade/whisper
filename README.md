# Voice Recorder and Transcriber

A web-based application that allows users to record audio in Hebrew or English, save recordings locally, and transcribe them using OpenAI's Whisper model.

## Features

- Record audio in Hebrew or English
- Save recordings locally
- Transcribe recordings using OpenAI's Whisper model
- Generate titles for recordings using OpenAI's GPT model
- View history of recordings with their transcriptions
- Play back recorded audio

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
- `backend/` - Contains the Node.js server code
- `uploads/` - Temporary storage for uploaded audio files
- `recordings/` - Storage for processed recordings and metadata

## Technologies Used

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- APIs: OpenAI Whisper for transcription, OpenAI GPT for title generation
- Audio Recording: Web Audio API and MediaRecorder API
