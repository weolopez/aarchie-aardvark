// Integration test for GeminiProvider (real API)
import dotenv from 'dotenv';
dotenv.config();

import { GeminiProvider } from '../../../../core/api-client/src/providers/gemini.js';

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';

async function runIntegrationTest() {
  const provider = new GeminiProvider({
    apiKey,
    model,
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta'
  });

  const request = {
    messages: [
      { role: 'user', content: 'Hello' }
    ],
    systemInstruction: 'You are a helpful AI assistant. Answer questions directly and factually.',
    temperature: 0.7,
    maxTokens: 4096
  };

  try {
    // Non-streaming test
    const response = await provider.sendRequest(request);
    console.log('Non-streaming response:', JSON.stringify(response, null, 2));
    if (!response.candidates || !response.candidates[0]?.content?.parts[0]?.text) {
      throw new Error('Invalid response structure');
    }
    console.log('✅ Non-streaming test passed.');

    // Streaming test
    let chunks = [];
    await provider.streamRequest(request, (chunk) => {
      chunks.push(chunk);
      process.stdout.write('.');
    });
    console.log('\nStreaming chunks received:', chunks.length);
    if (chunks.length === 0) throw new Error('No streaming chunks received');
    if (!chunks[0].candidates) throw new Error('Streaming chunk missing candidates');
    console.log('✅ Streaming test passed.');

    process.exit(0);
  } catch (err) {
    console.error('❌ Integration test failed:', err);
    process.exit(1);
  }
}

runIntegrationTest();
