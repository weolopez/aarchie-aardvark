// Integration test for web worker using Gemini API
import { Worker } from 'worker_threads';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workerPath = path.resolve(__dirname, '../../../../../src/agent/worker.js');

async function runWorkerTest() {
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerPath, { type: 'module' });
    const chatResponses = [];
    let chatSent = false;
    let timeoutId;

    function finish(success) {
      clearTimeout(timeoutId);
      if (success) {
        console.log('Full chat response:', JSON.stringify(chatResponses, null, 2));
        resolve();
      } else {
        reject(new Error('No chat response received from worker in time.'));
      }
      worker.terminate();
    }

    worker.on('message', (msg) => {
      console.log('[Worker message]', JSON.stringify(msg));
      if (msg.type === 'ready') {
        setTimeout(() => {
          worker.postMessage({
            type: 'chat',
            id: 'test-chat',
            payload: {
              message: 'Hello',
              sessionId: 'test-session'
            }
          });
          chatSent = true;
        }, 500); // 500ms delay after ready
      } else if (msg.type === 'step') {
        chatResponses.push(msg.content);
        console.log('Received step:', msg.content);
      } else if (msg.type === 'error') {
        finish(false);
      } else if (msg.type === 'done') {
        finish(true);
      } else {
        // Log any other message types
        console.log('[Worker other message]', JSON.stringify(msg));
      }
    });

    worker.on('error', (err) => {
      finish(false);
    });

    // Send init
    worker.postMessage({
      type: 'init',
      id: 'test-init',
      payload: {
        apiKey,
        provider: 'gemini',
        model,
        temperature: 0.7,
        systemInstruction: 'You are a helpful AI assistant. Answer questions directly and factually.',
        maxTokens: 4096
      }
    });

    // Timeout if no response in 20 seconds
    timeoutId = setTimeout(() => finish(false), 20000);
  });
}

runWorkerTest()
  .then(() => {
    console.log('✅ Web worker integration test passed.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Web worker integration test failed:', err);
    process.exit(1);
  });
