const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('./server');

// Mock OpenAI client
jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => {
      return {
        audio: {
          transcriptions: {
            create: jest.fn().mockResolvedValue('This is a test transcription')
          }
        },
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{ message: { content: 'Test Recording Title' } }]
            })
          }
        }
      };
    })
  };
});

// Mock file system operations
jest.mock('fs', () => {
  const originalFs = jest.requireActual('fs');
  return {
    ...originalFs,
    writeFileSync: jest.fn(),
    readFileSync: jest.fn().mockReturnValue(JSON.stringify([])),
    existsSync: jest.fn().mockReturnValue(true),
    mkdirSync: jest.fn(),
    createReadStream: jest.fn().mockReturnValue({})
  };
});

describe('Server API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/recordings', () => {
    it('should return an array of recordings', async () => {
      fs.readFileSync.mockReturnValueOnce(JSON.stringify([
        { id: '1', title: 'Test Recording' }
      ]));

      const response = await request(app).get('/api/recordings');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual([{ id: '1', title: 'Test Recording' }]);
    });

    it('should handle errors', async () => {
      fs.readFileSync.mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      const response = await request(app).get('/api/recordings');
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/recording/:id', () => {
    it('should return a specific recording', async () => {
      fs.readFileSync.mockReturnValueOnce(JSON.stringify([
        { id: '1', title: 'Test Recording 1' },
        { id: '2', title: 'Test Recording 2' }
      ]));

      const response = await request(app).get('/api/recording/2');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: '2', title: 'Test Recording 2' });
    });

    it('should return 404 if recording not found', async () => {
      fs.readFileSync.mockReturnValueOnce(JSON.stringify([
        { id: '1', title: 'Test Recording' }
      ]));

      const response = await request(app).get('/api/recording/999');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  // Note: Testing the upload endpoint would require more complex mocking of multer
  // This is a simplified test that doesn't actually test file upload
  describe('POST /api/upload', () => {
    it('should process audio and return transcription data', async () => {
      // This test would need more setup in a real scenario
      // We're just testing the basic structure here
      const response = await request(app)
        .post('/api/upload')
        .field('language', 'english');
      
      // Since we're not actually sending a file, we expect a 400 error
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
});
