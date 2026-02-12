// src/agent/tests/protocol.spec.js
import { Protocol } from '../protocol.js';

describe('Protocol Message Handling', () => {
  let protocol;
  let mockController;
  let mockAgent;
  let mockMessageBridge;

  beforeEach(() => {
    mockAgent = {
      init: jest.fn().mockResolvedValue(),
      chat: jest.fn().mockResolvedValue({ content: 'response' }),
      approveTool: jest.fn()
    };

    mockMessageBridge = {
      send: jest.fn()
    };

    mockController = {
      agent: mockAgent,
      messageBridge: mockMessageBridge
    };

    protocol = new Protocol(mockController);
  });

  test('handles init messages', async () => {
    const payload = { apiKey: 'test', model: 'gemini-3-flash-preview' };

    await protocol.handleInit({ id: 'init-1', payload });

    expect(mockAgent.init).toHaveBeenCalledWith(payload, mockMessageBridge);
    expect(mockMessageBridge.send).toHaveBeenCalledWith('response', {
      id: 'init-1',
      success: true
    });
  });

  test('handles init errors', async () => {
    mockAgent.init.mockRejectedValue(new Error('Init failed'));

    await protocol.handleInit({ id: 'init-1', payload: {} });

    expect(mockMessageBridge.send).toHaveBeenCalledWith('response', {
      id: 'init-1',
      success: false,
      error: 'Init failed'
    });
  });

  test('handles chat messages', async () => {
    const payload = { message: 'Hello', sessionId: 'session-1' };
    mockAgent.chat.mockResolvedValue({ content: 'Hi there!' });

    await protocol.handleChat({ id: 'chat-1', payload });

    expect(mockAgent.chat).toHaveBeenCalledWith('Hello', 'session-1');
    expect(mockMessageBridge.send).toHaveBeenCalledWith('response', {
      id: 'chat-1',
      success: true,
      result: { content: 'Hi there!' }
    });
  });

  test('handles chat errors', async () => {
    mockAgent.chat.mockRejectedValue(new Error('Chat failed'));

    await protocol.handleChat({ id: 'chat-1', payload: { message: 'test', sessionId: 'session-1' } });

    expect(mockMessageBridge.send).toHaveBeenCalledWith('response', {
      id: 'chat-1',
      success: false,
      error: 'Chat failed'
    });
  });

  test('handles tool approval', () => {
    const payload = { toolId: 'tool-123', approved: true };

    protocol.handleApproveTool({ id: 'approve-1', payload });

    expect(mockAgent.approveTool).toHaveBeenCalledWith('tool-123', true);
  });

  test('handles load repo', () => {
    const payload = { owner: 'test', repo: 'project' };

    protocol.handleLoadRepo({ id: 'load-1', payload });

    expect(mockMessageBridge.send).toHaveBeenCalledWith('response', {
      id: 'load-1',
      success: true,
      result: { message: 'Repository loading not yet implemented' }
    });
  });

  describe('Message Validation', () => {
    test('validates init messages', () => {
      expect(() => protocol.validateMessage({
        type: 'init',
        id: 'test',
        payload: { apiKey: 'key' }
      })).not.toThrow();
    });

    test('rejects init without apiKey', () => {
      expect(() => protocol.validateMessage({
        type: 'init',
        id: 'test',
        payload: {}
      })).toThrow('Init message must include apiKey');
    });

    test('validates chat messages', () => {
      expect(() => protocol.validateMessage({
        type: 'chat',
        id: 'test',
        payload: { message: 'hello', sessionId: 'session-1' }
      })).not.toThrow();
    });

    test('rejects chat without message', () => {
      expect(() => protocol.validateMessage({
        type: 'chat',
        id: 'test',
        payload: { sessionId: 'session-1' }
      })).toThrow('Chat message must include message and sessionId');
    });

    test('validates approve_tool messages', () => {
      expect(() => protocol.validateMessage({
        type: 'approve_tool',
        id: 'test',
        payload: { toolId: 'tool-1', approved: true }
      })).not.toThrow();
    });

    test('rejects approve_tool without boolean approved', () => {
      expect(() => protocol.validateMessage({
        type: 'approve_tool',
        id: 'test',
        payload: { toolId: 'tool-1', approved: 'yes' }
      })).toThrow('Approve tool message must include toolId and approved boolean');
    });

    test('rejects messages without type', () => {
      expect(() => protocol.validateMessage({ id: 'test' })).toThrow('Message must have a type');
    });

    test('rejects messages without id', () => {
      expect(() => protocol.validateMessage({ type: 'init' })).toThrow('Message must have an id');
    });
  });
});
