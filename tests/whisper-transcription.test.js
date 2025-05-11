/**
 * Unit tests for Whisper Transcription Service
 */

// Mock dependencies before requiring the module
jest.mock('fs');
jest.mock('path');
jest.mock('fluent-ffmpeg', () => {
  const mockFfmpeg = jest.fn().mockReturnValue({
    output: jest.fn().mockReturnThis(),
    audioCodec: jest.fn().mockReturnThis(),
    audioBitrate: jest.fn().mockReturnThis(),
    audioChannels: jest.fn().mockReturnThis(),
    audioFrequency: jest.fn().mockReturnThis(),
    on: jest.fn().mockImplementation(function(event, callback) {
      if (event === 'end') {
        callback();
      }
      return this;
    }),
    run: jest.fn().mockImplementation(callback => callback(null))
  });
  
  mockFfmpeg.setFfmpegPath = jest.fn();
  
  return mockFfmpeg;
});

jest.mock('../backend/utils/large-file-handler');

// Now require dependencies
const fs = require('fs');
const path = require('path');

// Now require the module after mocking
const { transcribeWithWhisper } = require('../backend/utils/whisper-transcription');
const { processLargeAudioFile, MAX_FILE_SIZE, cleanupTempFiles } = require('../backend/utils/large-file-handler');

describe('Whisper Transcription Service', () => {
  // Mock OpenAI client
  const mockOpenAI = {
    audio: {
      transcriptions: {
        create: jest.fn().mockResolvedValue('This is a mock transcription.')
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
    fs.readdirSync.mockReturnValue(['chunk1.mp3', 'chunk2.mp3']);
    
    path.join.mockImplementation((...args) => args.join('/'));
    path.dirname.mockReturnValue('/mock/dir');
    path.basename.mockImplementation((file, ext) => ext ? 'mock-file' : 'mock-file.mp3');
    path.extname.mockReturnValue('.mp3');
    
    processLargeAudioFile.mockResolvedValue(['/mock/dir/temp_splits/chunk1.mp3', '/mock/dir/temp_splits/chunk2.mp3']);
    
    // Mock cleanupTempFiles to actually call fs.unlinkSync when cleanup is true
    cleanupTempFiles.mockImplementation((files) => {
      files.forEach(file => fs.unlinkSync(file));
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
    fs.statSync.mockReturnValueOnce({ size: MAX_FILE_SIZE + 1024 * 1024 })
      // Second call is for the MP3 file size check
      .mockReturnValueOnce({ size: MAX_FILE_SIZE + 1024 })
      // Additional calls for each chunk file size check
      .mockReturnValue({ size: MAX_FILE_SIZE / 2 });
    
    const result = await transcribeWithWhisper(mockOpenAI, '/path/to/large-file.mp3', 'en');
    
    // With two chunks, we expect two transcriptions concatenated
    expect(result).toBe('This is a mock transcription. This is a mock transcription.');
    expect(processLargeAudioFile).toHaveBeenCalledTimes(1);
    expect(mockOpenAI.audio.transcriptions.create).toHaveBeenCalledTimes(2);
  });

  test('should handle language parameter correctly', async () => {
    // Set language to Hebrew
    await transcribeWithWhisper(mockOpenAI, '/path/to/file.mp3', 'hebrew');
    
    // Check if the language parameter was passed correctly
    expect(mockOpenAI.audio.transcriptions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'whisper-1',
        language: 'he'
      })
    );
  });

  test('should clean up temporary files when cleanup is true', async () => {
    // Set file size to be greater than MAX_FILE_SIZE to trigger file splitting
    fs.statSync.mockReturnValueOnce({ size: MAX_FILE_SIZE + 1024 * 1024 })
      // Second call is for the MP3 file size check
      .mockReturnValueOnce({ size: MAX_FILE_SIZE + 1024 })
      // Additional calls for each chunk file size check
      .mockReturnValue({ size: MAX_FILE_SIZE / 2 });
    
    await transcribeWithWhisper(mockOpenAI, '/path/to/file.mp3', 'en', true);
    
    // Verify cleanupTempFiles was called
    expect(cleanupTempFiles).toHaveBeenCalled();
  });

  test('should not clean up temporary files when cleanup is false', async () => {
    // Reset the mocks
    cleanupTempFiles.mockClear();
    
    // Set file size to be greater than MAX_FILE_SIZE to trigger file splitting
    fs.statSync.mockReturnValueOnce({ size: MAX_FILE_SIZE + 1024 * 1024 })
      // Second call is for the MP3 file size check
      .mockReturnValueOnce({ size: MAX_FILE_SIZE + 1024 })
      // Additional calls for each chunk file size check
      .mockReturnValue({ size: MAX_FILE_SIZE / 2 });
    
    await transcribeWithWhisper(mockOpenAI, '/path/to/file.mp3', 'en', false);
    
    // Verify cleanupTempFiles was not called
    expect(cleanupTempFiles).not.toHaveBeenCalled();
  });

  test('should handle errors during transcription', async () => {
    // Mock API error
    mockOpenAI.audio.transcriptions.create.mockRejectedValueOnce(new Error('API error'));
    
    await expect(transcribeWithWhisper(mockOpenAI, '/path/to/file.mp3', 'en'))
      .rejects.toThrow('API error');
  });
  
  test('should save transcription to file for debugging', async () => {
    await transcribeWithWhisper(mockOpenAI, '/path/to/file.mp3', 'en');
    
    // Check if fs.writeFileSync was called to save the transcription
    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('transcription-'),
      expect.any(String)
    );
  });
});
