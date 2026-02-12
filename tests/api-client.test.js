import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const baseUrl = process.env.GEMINI_URL || 'https://generativelanguage.googleapis.com/v1beta/models';

if (!apiKey || apiKey === 'YOUR_NEW_API_KEY_HERE') {
  console.error('ERROR: GEMINI_API_KEY not set or invalid.');
  console.error('Please get a new API key from: https://makersuite.google.com/app/apikey');
  console.error('Then update your .env file with: GEMINI_API_KEY=your_new_key_here');
  process.exit(1);
}

const url = `${baseUrl}/${model}:generateContent?key=${apiKey}`;

const requestBody = {
  contents: [
    {
      parts: [{ text: "Say hello in one word." }],
      role: "user"
    }
  ],
  systemInstruction: {
    parts: [{ text: "You are a helpful assistant. Answer questions directly and factually." }]
  },
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 4096
  }
};

async function testApiClient() {
  try {
    console.log('Testing API Client with key ending in:', apiKey.slice(-4));
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    const data = await response.json();
    if (data.candidates && data.candidates[0].content.parts[0].text) {
      console.log('API Client Test Passed:', data.candidates[0].content.parts[0].text);
    } else {
      console.error('API Client Test Failed:', data);
    }
  } catch (error) {
    console.error('API Client Test Error:', error);
  }
}

testApiClient();
