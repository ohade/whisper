const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { OpenAI } = require('openai');
const { processRecording, getRecordingsMetadata, saveRecordingMetadata } = require('./utils/recording-processor');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    // Get the file extension from the original file or default to webm
    const originalExt = path.extname(file.originalname).toLowerCase();
    const extension = ['.webm', '.opus', '.mp3', '.wav', '.ogg'].includes(originalExt) ? originalExt : '.webm';
    cb(null, `recording-${timestamp}${extension}`);
  }
});

const upload = multer({ storage });

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Data structure to store recordings metadata
const recordingsDir = path.join(__dirname, '../recordings');
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true });
}

// Helper functions for recordings metadata are now imported from recording-processor module

// Routes
app.get('/api/recordings', (req, res) => {
  try {
    const recordings = getRecordingsMetadata();
    res.json(recordings);
  } catch (error) {
    console.error('Error fetching recordings:', error);
    res.status(500).json({ error: 'Failed to fetch recordings' });
  }
});

app.post('/api/upload', upload.single('audio'), async (req, res) => {
  try {
    const { language } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    try {
      // Use the extracted recording processor module to handle the entire flow
      const newRecording = await processRecording(openai, file.path, language);
      res.json(newRecording);
    } catch (processingError) {
      console.error('Processing error:', processingError);
      
      // Return appropriate error response based on error type
      if (processingError.message && processingError.message.includes('Invalid audio file')) {
        return res.status(400).json({ 
          error: 'Invalid audio file', 
          details: processingError.message,
          message: 'The uploaded audio file appears to be corrupted or in an unsupported format. Please try recording again.'
        });
      } else {
        return res.status(500).json({ 
          error: 'Failed to process audio', 
          details: processingError.message 
        });
      }
    }
  } catch (error) {
    console.error('Error processing audio:', error);
    res.status(500).json({ error: 'Failed to process audio' });
  }
});

app.get('/api/recording/:id', (req, res) => {
  try {
    const { id } = req.params;
    const recordings = getRecordingsMetadata();
    const recording = recordings.find(r => r.id === id);
    
    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }
    
    res.json(recording);
  } catch (error) {
    console.error('Error fetching recording:', error);
    res.status(500).json({ error: 'Failed to fetch recording' });
  }
});

app.get('/api/audio/:id', (req, res) => {
  try {
    const { id } = req.params;
    const recordings = getRecordingsMetadata();
    const recording = recordings.find(r => r.id === id);
    
    if (!recording || !recording.audioPath) {
      return res.status(404).json({ error: 'Audio file not found' });
    }
    
    res.sendFile(recording.audioPath);
  } catch (error) {
    console.error('Error streaming audio:', error);
    res.status(500).json({ error: 'Failed to stream audio' });
  }
});

// Update recording (title or transcription)
app.put('/api/recording/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updatedRecording = req.body;
    
    if (!updatedRecording) {
      return res.status(400).json({ error: 'No data provided' });
    }
    
    const recordings = getRecordingsMetadata();
    const index = recordings.findIndex(r => r.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Recording not found' });
    }
    
    // Preserve the audioPath and other fields that shouldn't be modified by the client
    const audioPath = recordings[index].audioPath;
    
    // Update the recording
    recordings[index] = {
      ...updatedRecording,
      audioPath // Ensure audioPath is preserved
    };
    
    // Save updated metadata
    saveRecordingMetadata(recordings);
    
    res.json(recordings[index]);
  } catch (error) {
    console.error('Error updating recording:', error);
    res.status(500).json({ error: 'Failed to update recording' });
  }
});

// Delete recording
app.delete('/api/recording/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    // Get recordings metadata
    const recordings = getRecordingsMetadata();
    const index = recordings.findIndex(r => r.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Recording not found' });
    }
    
    // Get the audio file path before removing from metadata
    const audioPath = recordings[index].audioPath;
    
    // Remove recording from metadata
    recordings.splice(index, 1);
    saveRecordingMetadata(recordings);
    
    // Delete the audio file if it exists
    if (audioPath && fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
    }
    
    res.json({ success: true, message: 'Recording deleted successfully' });
  } catch (error) {
    console.error('Error deleting recording:', error);
    res.status(500).json({ error: 'Failed to delete recording' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app; // Export for testing
