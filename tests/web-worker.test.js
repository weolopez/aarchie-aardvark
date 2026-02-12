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

async function testWebWorkerIntegration() {
  try {
    console.log('Testing Web Worker Integration with key ending in:', apiKey.slice(-4));
    const worker = new Worker('../src/agent/worker.js', { type: 'module' });
    let ready = false;
    let chatSuccess = false;

    worker.onmessage = (event) => {
      if (event.data.type === 'ready') {
        ready = true;
        console.log('Web Worker Ready:', event.data);
        worker.postMessage({
          type: 'init',
          id: 'init-test',
          payload: { apiKey, model, systemInstruction: "You are a helpful assistant. Answer questions directly and factually." }
        });
      }
      if (event.data.type === 'step' && event.data.payload.content) {
        chatSuccess = true;
        console.log('Web Worker Chat Response:', event.data.payload.content);
        worker.terminate();
      }
      if (event.data.type === 'error') {
        console.error('Web Worker Error:', event.data.payload);
        worker.terminate();
      }
    };

    setTimeout(() => {
      if (!ready) {
        console.error('Web Worker Test Timeout: Worker did not respond in time');
        worker.terminate();
      } else if (!chatSuccess) {
        console.error('Web Worker Test Timeout: No chat response received');
        worker.terminate();
      }
    }, 15000);

    // Send chat after worker is ready
    setTimeout(() => {
      if (ready) {
        worker.postMessage({
          type: 'chat',
          id: 'chat-test',
          payload: { message: 'Hello!', sessionId: 'test-session' }
        });
      }
    }, 3000);

  } catch (error) {
    console.error('Web Worker Integration Test Error:', error);
  }
}

testWebWorkerIntegration();
