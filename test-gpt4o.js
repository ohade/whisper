require('dotenv').config();
const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Sample transcription text (replace with your own sample)
const sampleTranscription = "Today we discussed the new project timeline and assigned tasks to team members. We need to finish the initial prototype by next Friday and prepare for the client presentation on Monday.";

// Language of the transcription
const language = "English";

async function testGPT4oTitleGeneration() {
  console.log('Testing GPT-4o title generation...');
  console.log(`Sample transcription: "${sampleTranscription.substring(0, 50)}..."`);
  
  try {
    // Generate title using GPT-4o
    const titleResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Generate a short, concise title (3-5 words) that captures the essence of the following ${language} text. Return only the title, nothing else.`
        },
        {
          role: "user",
          content: sampleTranscription
        }
      ],
      max_tokens: 20
    });

    const title = titleResponse.choices[0].message.content.trim();
    console.log('Generated title:', title);
    console.log('Title generation successful!');
    return title;
  } catch (error) {
    console.error('Error generating title with GPT-4o:', error);
    throw error;
  }
}

// Run the test
testGPT4oTitleGeneration()
  .then(() => console.log('Test completed successfully'))
  .catch(err => console.error('Test failed:', err));
