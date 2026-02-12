// www/components/web_worker/test.js
export class WebWorkerTest {
  constructor() {
    this.worker = null;
    this.isInitialized = false;
    this.pendingRequests = new Map();
    this.messages = [];
    this.currentStreamingMessage = null;
    this.config = null;
    this.logs = [];
  }

  init() {
    this.loadConfig();
    this.bindEvents();
    this.updateUIState();
    this.log('Application initialized');
  }

  // Configuration Management
  loadConfig() {
    const saved = localStorage.getItem('ai_agent_config');
    if (saved) {
      try {
        this.config = JSON.parse(saved);
        this.log('Configuration loaded from storage');
      } catch (e) {
        this.log('Failed to parse saved config');
        this.config = null;
      }
    }
  }

  saveConfig(config) {
    this.config = config;
    localStorage.setItem('ai_agent_config', JSON.stringify(config));
    this.log('Configuration saved to storage');
  }

  clearConfig() {
    this.config = null;
    localStorage.removeItem('ai_agent_config');
    this.log('Configuration cleared');
  }

  hasConfig() {
    return this.config && this.config.apiKey;
  }

  // UI State Management
  updateUIState() {
    const configPanel = document.getElementById('configPanel');
    const welcomeState = document.getElementById('welcomeState');
    const chatInterface = document.getElementById('chatInterface');
    const settingsBtn = document.getElementById('settingsBtn');

    if (this.hasConfig()) {
      // Has config - show chat or welcome to initialize
      configPanel.classList.add('hidden');
      welcomeState.classList.add('hidden');
      chatInterface.classList.remove('hidden');
      settingsBtn.classList.remove('hidden');
      
      // Auto-initialize if not already
      if (!this.isInitialized) {
        this.initializeWorker();
      }
    } else {
      // No config - show welcome
      configPanel.classList.add('hidden');
      welcomeState.classList.remove('hidden');
      chatInterface.classList.add('hidden');
      settingsBtn.classList.add('hidden');
    }

    this.updateConnectionStatus();
  }

  showConfigPanel() {
    const configPanel = document.getElementById('configPanel');
    const welcomeState = document.getElementById('welcomeState');
    
    // Populate fields if config exists
    if (this.config) {
      document.getElementById('apiKey').value = this.config.apiKey || '';
      document.getElementById('provider').value = this.config.provider || 'gemini';
      document.getElementById('model').value = this.config.model || 'gemini-3-flash-preview';
      document.getElementById('temperature').value = this.config.temperature || 0.7;
    }
    
    configPanel.classList.remove('hidden');
    welcomeState.classList.add('hidden');
  }

  hideConfigPanel() {
    const configPanel = document.getElementById('configPanel');
    configPanel.classList.add('hidden');
    
    if (!this.hasConfig()) {
      document.getElementById('welcomeState').classList.remove('hidden');
    } else {
      document.getElementById('chatInterface').classList.remove('hidden');
    }
  }

  // Event Binding
  bindEvents() {
    // Welcome screen
    document.getElementById('setupBtn').addEventListener('click', () => this.showConfigPanel());
    
    // Config panel
    document.getElementById('saveConfigBtn').addEventListener('click', () => this.saveConfiguration());
    document.getElementById('resetConfigBtn').addEventListener('click', () => this.resetConfiguration());
    document.getElementById('closeConfigBtn').addEventListener('click', () => this.hideConfigPanel());
    document.getElementById('settingsBtn').addEventListener('click', () => this.showConfigPanel());
    
    // Chat interface
    document.getElementById('sendBtn').addEventListener('click', () => this.sendMessage());
    document.getElementById('messageInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    document.getElementById('messageInput').addEventListener('input', (e) => this.adjustTextareaHeight(e.target));
    document.getElementById('clearBtn').addEventListener('click', () => this.clearMessages());
    
    // Logs toggle
    document.getElementById('toggleLogsBtn').addEventListener('click', () => this.toggleLogs());
  }

  adjustTextareaHeight(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    
    const clearBtn = document.getElementById('clearBtn');
    if (textarea.value.trim()) {
      clearBtn.classList.remove('hidden');
    } else {
      clearBtn.classList.add('hidden');
    }
  }

  // Configuration Actions
  saveConfiguration() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const provider = document.getElementById('provider').value;
    const model = document.getElementById('model').value;
    const temperature = parseFloat(document.getElementById('temperature').value);

    if (!apiKey) {
      this.showNotification('API key is required', 'error');
      return;
    }

    this.saveConfig({ apiKey, provider, model, temperature });
    this.hideConfigPanel();
    this.updateUIState();
    this.showNotification('Configuration saved', 'success');
  }

  resetConfiguration() {
    document.getElementById('apiKey').value = '';
    document.getElementById('provider').value = 'gemini';
    document.getElementById('model').value = 'gemini-pro';
    document.getElementById('temperature').value = '0.7';
    this.clearConfig();
    this.showNotification('Configuration reset', 'info');
  }

  // Worker Management
  async initializeWorker() {
    if (!this.config) {
      this.log('No configuration found');
      return;
    }

    try {
      // Terminate existing worker if any
      if (this.worker) {
        this.worker.terminate();
      }

      this.worker = new Worker('../../../src/agent/worker.js', { type: 'module' });
      this.worker.onmessage = (event) => this.handleMessage(event);
      this.worker.onerror = (error) => {
        this.log('Worker error: ' + error.message);
        this.updateConnectionStatus();
      };

      const initId = 'init-' + Date.now();
      this.pendingRequests.set(initId, { type: 'init' });

      this.worker.postMessage({
        type: 'init',
        id: initId,
        payload: {
          apiKey: this.config.apiKey,
          provider: this.config.provider,
          model: this.config.model,
          temperature: this.config.temperature,
          maxTokens: 4096,
          timeout: 30000,
          retries: 3
        }
      });

      this.log('Initializing worker...');
      this.updateConnectionStatus('initializing');
    } catch (error) {
      this.log('Failed to initialize worker: ' + error.message);
      this.updateConnectionStatus('error');
    }
  }

  // Message Handling
  sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (!message || !this.isInitialized) return;

    // Add user message to UI
    this.addMessage('user', message);
    
    // Clear input
    input.value = '';
    input.style.height = 'auto';
    document.getElementById('clearBtn').classList.add('hidden');

    const chatId = 'chat-' + Date.now();
    this.pendingRequests.set(chatId, { type: 'chat' });

    this.worker.postMessage({
      type: 'chat',
      id: chatId,
      payload: {
        message,
        sessionId: 'test-session-' + Date.now()
      }
    });

    this.log('Sending message: ' + message.substring(0, 50) + (message.length > 50 ? '...' : ''));
    
    // Show typing indicator
    this.showTypingIndicator();
  }

  handleMessage(event) {
    const data = event.data;
    
    // Handle bridge message format
    if (data.type === 'bridge-message') {
      const eventName = data.event;
      const payload = data.data;
      
      this.log(`Received: ${eventName}`, payload);

      switch (eventName) {
        case 'ready':
          this.isInitialized = true;
          this.hideTypingIndicator();
          this.updateConnectionStatus('connected');
          this.log('Worker ready - tool count: ' + (payload?.toolCount || 0));
          break;

        case 'step':
          this.hideTypingIndicator();
          if (payload?.done) {
            // Streaming complete
            if (this.currentStreamingMessage) {
              this.finalizeStreamingMessage(payload?.usage);
            }
          } else {
            // Streaming content
            if (!this.currentStreamingMessage) {
              this.currentStreamingMessage = this.addMessage('assistant', '');
            }
            this.appendToStreamingMessage(payload?.content);
          }
          break;

        case 'error':
          this.hideTypingIndicator();
          this.addMessage('error', payload?.message || 'Unknown error');
          if (payload?.details) {
            this.log('Error details: ' + payload.details);
          }
          break;

        case 'response':
          const request = this.pendingRequests.get(payload?.id);
          if (request) {
            this.pendingRequests.delete(payload.id);
            if (!payload?.success) {
              this.addMessage('error', 'Request failed: ' + payload?.error);
            }
          }
          break;

        case 'tool_pending':
          this.log('Tool pending approval: ' + payload?.tool?.name);
          // Auto-approve for testing
          this.worker.postMessage({
            type: 'approve_tool',
            id: 'approve-' + Date.now(),
            payload: {
              toolId: payload?.toolId,
              approved: true
            }
          });
          break;

        case 'tool_result':
          this.log('Tool result: ' + payload?.result);
          break;

        default:
          this.log('Unknown message type: ' + eventName);
      }
    } else if (data.type === 'ready') {
      // Handle legacy/direct ready message
      this.isInitialized = true;
      this.hideTypingIndicator();
      this.updateConnectionStatus('connected');
      this.log('Worker ready (direct)');
    } else {
      this.log('Unknown message format', data);
    }
  }

  // UI Message Management
  addMessage(role, content) {
    const messagesList = document.getElementById('messagesList');
    const messageId = 'msg-' + Date.now();
    
    const messageEl = document.createElement('div');
    messageEl.id = messageId;
    messageEl.className = 'message-bubble flex ' + (role === 'user' ? 'justify-end' : 'justify-start');
    
    const bubble = document.createElement('div');
    bubble.className = 'max-w-[80%] px-4 py-3 rounded-2xl ';
    
    if (role === 'user') {
      bubble.className += 'gradient-bg text-white rounded-br-md';
    } else if (role === 'assistant') {
      bubble.className += 'bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm';
    } else {
      bubble.className += 'bg-red-50 border border-red-200 text-red-800 rounded-md';
    }
    
    const contentEl = document.createElement('div');
    contentEl.className = 'prose prose-sm max-w-none';
    contentEl.textContent = content;
    
    bubble.appendChild(contentEl);
    messageEl.appendChild(bubble);
    messagesList.appendChild(messageEl);
    
    // Scroll to bottom
    messagesList.scrollTop = messagesList.scrollHeight;
    
    return messageId;
  }

  appendToStreamingMessage(content) {
    if (!this.currentStreamingMessage) return;
    
    const messageEl = document.getElementById(this.currentStreamingMessage);
    if (messageEl) {
      const contentEl = messageEl.querySelector('.prose');
      contentEl.textContent += content;
      
      const messagesList = document.getElementById('messagesList');
      messagesList.scrollTop = messagesList.scrollHeight;
    }
  }

  finalizeStreamingMessage(usage) {
    this.currentStreamingMessage = null;
    
    if (usage) {
      const tokenValue = document.getElementById('tokenValue');
      tokenValue.textContent = usage.total || 0;
      document.getElementById('tokenCount').classList.remove('hidden');
    }
  }

  showTypingIndicator() {
    document.getElementById('typingIndicator').classList.remove('hidden');
    const messagesList = document.getElementById('messagesList');
    messagesList.scrollTop = messagesList.scrollHeight;
  }

  hideTypingIndicator() {
    document.getElementById('typingIndicator').classList.add('hidden');
  }

  clearMessages() {
    const messagesList = document.getElementById('messagesList');
    messagesList.innerHTML = '';
    this.messages = [];
    this.currentStreamingMessage = null;
    document.getElementById('tokenCount').classList.add('hidden');
    this.log('Messages cleared');
  }

  // Connection Status
  updateConnectionStatus(status) {
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    const sendBtn = document.getElementById('sendBtn');

    switch (status) {
      case 'connected':
        dot.className = 'w-2 h-2 rounded-full bg-green-500 status-dot';
        text.textContent = 'Connected';
        text.className = 'text-sm font-medium text-green-600';
        sendBtn.disabled = false;
        break;
      case 'initializing':
        dot.className = 'w-2 h-2 rounded-full bg-yellow-400 status-dot';
        text.textContent = 'Initializing...';
        text.className = 'text-sm font-medium text-yellow-600';
        sendBtn.disabled = true;
        break;
      case 'error':
        dot.className = 'w-2 h-2 rounded-full bg-red-500';
        text.textContent = 'Error';
        text.className = 'text-sm font-medium text-red-600';
        sendBtn.disabled = true;
        break;
      default:
        dot.className = 'w-2 h-2 rounded-full bg-red-400';
        text.textContent = 'Disconnected';
        text.className = 'text-sm font-medium text-gray-600';
        sendBtn.disabled = true;
    }
  }

  // Logs Management
  toggleLogs() {
    const panel = document.getElementById('logsPanel');
    const chevron = document.getElementById('logsChevron');
    
    panel.classList.toggle('hidden');
    chevron.classList.toggle('rotate-180');
  }

  log(message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
      timestamp,
      message,
      data
    };
    
    this.logs.push(logEntry);
    
    // Update logs UI
    const logsContent = document.getElementById('logsContent');
    const logEl = document.createElement('div');
    logEl.className = 'text-gray-300';
    
    let logText = `[${timestamp}] ${message}`;
    if (data) {
      logText += ' ' + JSON.stringify(data).substring(0, 200);
    }
    
    logEl.textContent = logText;
    logsContent.appendChild(logEl);
    logsContent.scrollTop = logsContent.scrollHeight;
    
    // Update count
    document.getElementById('logCount').textContent = this.logs.length;
    
    // Console log
    console.log(message, data);
  }

  // Notifications
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 px-6 py-3 rounded-xl shadow-xl text-white font-medium z-50 slide-up ';
    
    switch (type) {
      case 'success':
        notification.className += 'bg-green-500';
        break;
      case 'error':
        notification.className += 'bg-red-500';
        break;
      case 'warning':
        notification.className += 'bg-yellow-500';
        break;
      default:
        notification.className += 'bg-blue-500';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateY(-10px)';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}
