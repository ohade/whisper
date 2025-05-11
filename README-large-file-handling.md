# Large File Handling for OpenAI Whisper API

This feature allows processing audio files larger than OpenAI's 25MB limit by splitting them at quiet points and transcribing each part separately.

## Overview

OpenAI's Whisper API has a 25MB file size limit. This implementation provides a solution to handle larger audio files by:

1. Converting audio to a more efficient format (MP3) to reduce file size
2. Detecting quiet points in the audio for optimal splitting
3. Splitting the audio file into smaller chunks
4. Transcribing each chunk separately
5. Combining the transcriptions into a single result

## Usage

### Using the Standalone Script

For direct processing of a large audio file:

```bash
node process-large-file.js --lang=hebrew|english --file=/path/to/your/audio-file.webm
```

This will:
- Process the file
- Split it if necessary
- Transcribe all parts
- Combine the transcriptions
- Save the result to a text file in the same directory as the input file

### Using the API Endpoint

The server has been updated to automatically handle large files. Simply upload your audio file as usual, and the server will:

1. Detect if the file exceeds the 25MB limit
2. Process it using the large file handler if needed
3. Return the combined transcription

## Implementation Details

### Components

1. **large-file-handler.js**: Core functionality for processing large audio files
2. **whisper-transcription.js**: Service for transcribing audio files with OpenAI Whisper
3. **process-large-file.js**: Standalone script for direct file processing

### Dependencies

- **fluent-ffmpeg**: Node.js wrapper for FFmpeg
- **ffmpeg-static**: Provides a static FFmpeg binary
- **openai**: OpenAI API client

### How It Works

1. **File Analysis**: The system first analyzes the audio file to determine its size and duration
2. **Format Conversion**: If needed, converts to a more efficient format (MP3) to reduce file size
3. **Silence Detection**: Uses FFmpeg's silencedetect filter to find quiet points in the audio
4. **Optimal Splitting**: Calculates the best points to split the audio to stay under the 25MB limit
5. **Transcription**: Processes each chunk with OpenAI's Whisper API
6. **Combination**: Merges all transcriptions into a single coherent text

## Troubleshooting

If you encounter issues:

1. Check that FFmpeg is properly installed or available through ffmpeg-static
2. Ensure your OpenAI API key is valid and has sufficient quota
3. For very large files, consider using lower quality audio settings to reduce file size
4. If silence detection fails, the system will fall back to time-based splitting

## Future Improvements

- Add support for more audio formats
- Implement more sophisticated silence detection algorithms
- Add parallel processing for faster transcription of multiple chunks
- Improve handling of language detection across chunks
