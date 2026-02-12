import { LLMClient } from '../components/agent/agent-core/src/llm-client.js';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

if (!apiKey || apiKey === 'YOUR_NEW_API_KEY_HERE') {
  console.error('ERROR: GEMINI_API_KEY not set or invalid.');
  console.error('Please get a new API key from: https://makersuite.google.com/app/apikey');
  console.error('Then update your .env file with: GEMINI_API_KEY=your_new_key_here');
  process.exit(1);
}

async function testContextBuilder() {
  const client = new LLMClient({ apiKey, model });
  try {
    console.log('Testing Context Builder with key ending in:', apiKey.slice(-4));
    const response = await client.chat({
      messages: [
        { role: 'user', content: 'Summarize: The quick brown fox jumps over the lazy dog.' }
      ],
      systemInstruction: "You are a helpful assistant. Answer questions directly and factually."
    });
    if (response.content && response.content.length > 0) {
      console.log('Context Builder Test Passed:', response.content);
    } else {
      console.error('Context Builder Test Failed:', response);
    }
  } catch (error) {
    console.error('Context Builder Test Error:', error);
  }
}

testContextBuilder();
