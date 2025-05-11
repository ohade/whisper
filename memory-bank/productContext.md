# Product Context

## Project Overview
- **Name**: Voice Recorder and Transcriber
- **Description**: A web-based application that allows users to record audio in Hebrew or English, save recordings locally, and transcribe them using OpenAI's Whisper model.
- **Created**: 2025-05-08

## Core Features
- Record audio in Hebrew or English
- Save recordings locally
- Transcribe recordings using OpenAI's Whisper model
- Display transcription results
- Maintain a history of recordings with auto-generated titles
- View past recordings and their transcriptions
- Generate meeting summaries from transcriptions using OpenAI's o3 model

## Technical Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js with Express
- API Integration: OpenAI API (Whisper for transcription, GPT-4o for title generation, o3 for meeting summaries)
- Data Storage: Local file system

## User Experience Requirements
- Clean interface with clear recording controls
- Language selection (Hebrew/English)
- Recording status indicator
- Save/Cancel options
- Processing indicator with timer during transcription
- History panel showing past recordings
- Detailed view for each recording
- Meeting summary generation with context input dialog
- Editable meeting summaries with auto-save functionality

## Last Updated
[2025-05-08 19:55:04] - Initial project setup
[2025-05-11 22:06:15] - Added meeting summary generation feature
