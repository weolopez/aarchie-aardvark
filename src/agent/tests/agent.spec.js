// src/agent/tests/agent.spec.js
import { Agent } from '../agent.js';

// Mock the API Client
jest.mock('../../core/api-client/src/index.js', () => ({
  APIClient: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(),
    streamRequest: jest.fn()
  }))
}));

describe('Agent API Client Integration', () => {
  let agent;
  let mockApiClient;
  let mockMessageBridge;

  beforeEach(() => {
    const { APIClient } = require('../../core/api-client/src/index.js');
    mockApiClient = new APIClient();
    agent = new Agent();
    mockMessageBridge = {
      send: jest.fn()
    };
  });

  test('initializes with config', async () => {
    const config = {
      apiKey: 'test-key',
      model: 'gemini-3-flash-preview',
      provider: 'gemini'
    };

    await agent.init(config, mockMessageBridge);

    expect(agent.config).toEqual(config);
    expect(agent.messageBridge).toBe(mockMessageBridge);
    expect(mockApiClient.initialize).toHaveBeenCalledWith({
      provider: 'gemini',
      apiKey: 'test-key',
      model: 'gemini-3-flash-preview',
      timeout: 30000,
      retries: 3
    });
  });

  test('handles streaming responses', async () => {
    const config = { apiKey: 'test', model: 'gemini-3-flash-preview' };
    await agent.init(config, mockMessageBridge);

    // Mock streaming response
    mockApiClient.streamRequest.mockImplementation(async (request, onChunk) => {
      onChunk('Hello');
      onChunk(' world');
      onChunk('!');
      return {
        content: 'Hello world!',
        usage: { prompt: 10, completion: 15, total: 25 }
      };
    });

    await agent.chat('Test message', 'session-1');

    expect(mockMessageBridge.send).toHaveBeenCalledWith('step', {
      content: 'Hello',
      sessionId: 'session-1',
      done: false
    });
    expect(mockMessageBridge.send).toHaveBeenCalledWith('step', {
      content: ' world',
      sessionId: 'session-1',
      done: false
    });
    expect(mockMessageBridge.send).toHaveBeenCalledWith('step', {
      content: '!',
      sessionId: 'session-1',
      done: false
    });
    expect(mockMessageBridge.send).toHaveBeenCalledWith('step', {
      content: '',
      sessionId: 'session-1',
      done: true,
      usage: { prompt: 10, completion: 15, total: 25 }
    });
  });

  test('handles API errors', async () => {
    const config = { apiKey: 'test', model: 'gemini-3-flash-preview' };
    await agent.init(config, mockMessageBridge);

    mockApiClient.streamRequest.mockRejectedValue(new Error('API Error'));

    await expect(agent.chat('Test', 'session-1')).rejects.toThrow('API Error');

    expect(mockMessageBridge.send).toHaveBeenCalledWith('error', {
      message: 'LLM request failed',
      details: 'API Error'
    });
  });

  test('approves tools', () => {
    agent.messageBridge = mockMessageBridge;
    agent.approveTool('tool-123', true);

    expect(mockMessageBridge.send).toHaveBeenCalledWith('tool_result', {
      toolId: 'tool-123',
      approved: true,
      result: 'Tool execution approved'
    });
  });
});
