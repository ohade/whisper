# Decision Log

## Technical Decisions

[2025-05-08 19:55:04] - **Web Technology Stack**
- Decision: Use HTML, CSS, and JavaScript for frontend with Node.js/Express backend
- Rationale: These technologies provide a good balance of simplicity and capability for a local web application
- Implications: Easy to develop and deploy locally, good browser compatibility

[2025-05-08 19:55:04] - **Audio Recording Approach**
- Decision: Use Web Audio API for recording functionality
- Rationale: Native browser API that provides access to device microphone without additional dependencies
- Implications: Cross-browser compatibility considerations needed

[2025-05-08 19:55:04] - **Transcription Service**
- Decision: Use OpenAI's Whisper model via API
- Rationale: Provides high-quality multilingual transcription including Hebrew and English
- Implications: Requires API key management and handling API rate limits/costs

[2025-05-08 19:55:04] - **Title Generation**
- Decision: Use OpenAI's GPT model to generate titles from transcription text
- Rationale: Provides intelligent summarization of content for history listing
- Implications: Additional API call required after transcription

[2025-05-08 19:55:04] - **Data Storage**
- Decision: Store recordings and transcriptions locally in the file system
- Rationale: Simplifies architecture and meets requirement for local storage
- Implications: Need to handle file system operations and maintain data structure

[2025-05-08 21:36:23] - **Three-Column Layout with Calendar in Right Panel**
- Decision: Implement a three-column layout with the calendar moved to a dedicated right panel
- Rationale: Improves UI organization, provides better visual separation between components, and makes better use of screen space on larger displays
- Implications: Required responsive design adjustments for smaller screens, ensuring the calendar remains usable on mobile devices
