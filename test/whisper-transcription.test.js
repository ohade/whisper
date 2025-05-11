/**
 * Unit tests for Whisper Transcription Service
 */

const fs = require('fs');
const path = require('path');
const { transcribeWithWhisper } = require('../backend/utils/whisper-transcription');
const { processLargeAudioFile, MAX_FILE_SIZE } = require('../backend/utils/large-file-handler');

// Mock dependencies
jest.mock('fs');
jest.mock('path');
jest.mock('fluent-ffmpeg');
jest.mock('../backend/utils/large-file-handler');

describe('Whisper Transcription Service', () => {
  // Mock OpenAI client
  const mockOpenAI = {
    audio: {
      transcriptions: {
        create: jest.fn()
      }
    }
  };

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Default mock implementations
    fs.existsSync.mockReturnValue(true);
    fs.statSync.mockReturnValue({ size: 1024 * 1024 * 10 }); // 10MB by default
    fs.createReadStream.mockReturnValue('mock-stream');
    fs.writeFileSync.mockImplementation(() => {});
    fs.unlinkSync.mockImplementation(() => {});
    fs.mkdirSync.mockImplementation(() => {});
    
    path.join.mockImplementation((...args) => args.join('/'));
    path.dirname.mockReturnValue('/mock/dir');
    path.basename.mockReturnValue('mock-file.mp3');
    
    processLargeAudioFile.mockResolvedValue(['/mock/dir/temp_splits/chunk1.mp3', '/mock/dir/temp_splits/chunk2.mp3']);
    
    // Mock OpenAI transcription response
    mockOpenAI.audio.transcriptions.create.mockResolvedValue({
      text: 'This is a mock transcription.'
    });
  });

  test('should throw error if file does not exist', async () => {
    fs.existsSync.mockReturnValue(false);
    
    await expect(transcribeWithWhisper(mockOpenAI, '/path/to/nonexistent.mp3', 'en'))
      .rejects.toThrow('File not found: /path/to/nonexistent.mp3');
  });

  test('should transcribe small file directly', async () => {
    // Set file size to be less than MAX_FILE_SIZE
    fs.statSync.mockReturnValue({ size: MAX_FILE_SIZE - 1024 });
    
    const result = await transcribeWithWhisper(mockOpenAI, '/path/to/small-file.mp3', 'en');
    
    expect(result).toBe('This is a mock transcription.');
    expect(mockOpenAI.audio.transcriptions.create).toHaveBeenCalledTimes(1);
    expect(processLargeAudioFile).not.toHaveBeenCalled();
  });

  test('should process and transcribe large file', async () => {
    // Set file size to be greater than MAX_FILE_SIZE
    fs.statSync.mockReturnValue({ size: MAX_FILE_SIZE + 1024 * 1024 });
    
    const result = await transcribeWithWhisper(mockOpenAI, '/path/to/large-file.mp3', 'en');
    
    expect(result).toBe('This is a mock transcription. This is a mock transcription.');
    expect(processLargeAudioFile).toHaveBeenCalledTimes(1);
    expect(mockOpenAI.audio.transcriptions.create).toHaveBeenCalledTimes(2);
  });

  test('should handle language parameter correctly', async () => {
    await transcribeWithWhisper(mockOpenAI, '/path/to/file.mp3', 'he');
    
    expect(mockOpenAI.audio.transcriptions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        language: 'he'
      })
    );
  });

  test('should clean up temporary files when cleanup is true', async () => {
    // Mock implementation for fs.readdirSync to return mock files
    fs.readdirSync.mockReturnValue(['chunk1.mp3', 'chunk2.mp3']);
    
    await transcribeWithWhisper(mockOpenAI, '/path/to/file.mp3', 'en', true);
    
    // Check if fs.unlinkSync was called for each temp file
    expect(fs.unlinkSync).toHaveBeenCalled();
  });

  test('should not clean up temporary files when cleanup is false', async () => {
    await transcribeWithWhisper(mockOpenAI, '/path/to/file.mp3', 'en', false);
    
    // Check if fs.unlinkSync was not called
    expect(fs.unlinkSync).not.toHaveBeenCalled();
  });

  test('should handle errors during transcription', async () => {
    mockOpenAI.audio.transcriptions.create.mockRejectedValue(new Error('API error'));
    
    await expect(transcribeWithWhisper(mockOpenAI, '/path/to/file.mp3', 'en'))
      .rejects.toThrow('API error');
  });
});
