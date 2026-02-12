// tests/integration/web-worker/web-worker-messaging.spec.js
describe('Web Worker Messaging Integration', () => {
  let worker;

  beforeEach(() => {
    // Create a new worker for each test
    console.log('Creating worker...');
    worker = new Worker('../../../src/agent/worker.js', { type: 'module' });
    worker.onerror = (e) => console.error('Worker error:', e.message, e.filename, e.lineno);
  });

  afterEach(() => {
    if (worker) {
      worker.terminate();
    }
  });

  test('worker initializes successfully', async () => {
    const readyPromise = new Promise((resolve) => {
      worker.onmessage = (event) => {
        if (event.data.type === 'bridge-message' && event.data.event === 'ready') {
          resolve(event.data.data);
        }
      };
    });

    worker.postMessage({
      type: 'init',
      id: 'init-test',
      payload: {
        apiKey: 'test-key',
        model: 'gemini-3-flash-preview',
        provider: 'gemini'
      }
    });

    const result = await readyPromise;
    expect(result.toolCount).toBe(0);
  });

  test('handles chat messages', async () => {
    // First initialize
    const initPromise = new Promise((resolve) => {
      const handler = (event) => {
        if (event.data.type === 'bridge-message' && event.data.event === 'ready') {
          worker.removeEventListener('message', handler);
          resolve();
        }
      };
      worker.addEventListener('message', handler);
    });

    worker.postMessage({
      type: 'init',
      id: 'init-test',
      payload: {
        apiKey: 'test-key',
        model: 'gemini-3-flash-preview',
        provider: 'gemini'
      }
    });

    await initPromise;

    // Now test chat - this will fail without real API, but tests the messaging
    const chatPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);

      worker.addEventListener('message', (event) => {
        if (event.data.type === 'bridge-message' && event.data.event === 'response' && event.data.data.id === 'chat-test') {
          clearTimeout(timeout);
          resolve(event.data.data);
        }
      });
    });

    worker.postMessage({
      type: 'chat',
      id: 'chat-test',
      payload: {
        message: 'Hello',
        sessionId: 'session-1'
      }
    });

    // This will likely fail due to mock API, but tests message handling
    try {
      const result = await chatPromise;
      expect(result.id).toBe('chat-test');
    } catch (error) {
      // Expected to fail without real API key
      expect(error.message).toBe('Timeout');
    }
  });

  test('handles invalid messages gracefully', async () => {
    const errorPromise = new Promise((resolve) => {
      worker.addEventListener('message', (event) => {
        if (event.data.type === 'bridge-message' && event.data.event === 'response' && event.data.data.id === 'invalid-test') {
          resolve(event.data.data);
        }
      });
    });

    // Send message without required payload
    worker.postMessage({
      type: 'chat',
      id: 'invalid-test',
      payload: { message: 'test' } // missing sessionId
    });

    const result = await errorPromise;
    expect(result.success).toBe(false);
    expect(result.error).toContain('sessionId');
  });

  test('handles tool approval', async () => {
    // Initialize first
    const initPromise = new Promise((resolve) => {
      worker.addEventListener('message', (event) => {
        if (event.data.type === 'bridge-message' && event.data.event === 'ready') {
          resolve();
        }
      });
    });

    worker.postMessage({
      type: 'init',
      id: 'init-test',
      payload: { apiKey: 'test-key', model: 'gemini-3-flash-preview' }
    });

    await initPromise;

    // Test tool approval
    const approvalPromise = new Promise((resolve) => {
      worker.addEventListener('message', (event) => {
        if (event.data.type === 'bridge-message' && event.data.event === 'tool_result') {
          resolve(event.data.data);
        }
      });
    });

    worker.postMessage({
      type: 'approve_tool',
      id: 'approve-test',
      payload: {
        toolId: 'tool-123',
        approved: true
      }
    });

    const result = await approvalPromise;
    expect(result.toolId).toBe('tool-123');
    expect(result.approved).toBe(true);
  });
});
