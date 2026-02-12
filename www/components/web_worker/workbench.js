// Agent Workbench - Professional Developer Tool for Testing AI Agents
// A VS Code/DevTools-inspired interface for Web Worker integration testing

export class AgentWorkbench {
  constructor() {
    // State
    this.worker = null;
    this.isInitialized = false;
    this.config = null;
    this.sessions = [];
    this.currentSessionId = null;
    this.messages = [];
    this.pendingRequests = new Map();
    this.timeline = [];
    this.networkRequests = [];
    this.consoleLogs = [];
    this.currentMode = 'chat';
    this.currentStreamingMessage = null;
    this.startTime = null;
    
    // DOM Elements cache
    this.elements = {};
  }

  init() {
    this.cacheElements();
    this.loadConfig();
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
    this.updateUI();
    this.addTimelineEvent('app', 'Application initialized', 'info');
  }

  // Element caching for performance
  cacheElements() {
    const ids = [
      'emptyState', 'chatContainer', 'inputArea', 'messageInput', 'sendBtn',
      'connectBtn', 'settingsBtn', 'connectionStatus', 'statusDot', 'statusText',
      'settingsModal', 'closeSettings', 'cancelSettings', 'saveSettings',
      'modalApiKey', 'modalProvider', 'modalModel', 'modalTemp',
      'inspectorPanel', 'requestPanel', 'contextPanel', 'timelineList',
      'networkTableBody', 'consoleList', 'bottomPanel', 'sessionList',
      'reqProvider', 'reqModel', 'reqTemp', 'reqStatus', 'reqDuration', 'reqTokens',
      'ctxState', 'ctxMessages', 'ctxPending', 'timelineBadge', 'networkBadge',
      'commandPalette', 'paletteInput', 'paletteList', 'breadcrumbSession'
    ];
    
    ids.forEach(id => {
      this.elements[id] = document.getElementById(id);
    });
  }

  // Configuration Management
  loadConfig() {
    try {
      const saved = localStorage.getItem('agent_workbench_config');
      if (saved) {
        this.config = JSON.parse(saved);
        this.addTimelineEvent('config', 'Configuration loaded from storage', 'info');
      }
    } catch (e) {
      console.error('Failed to load config:', e);
    }
  }

  saveConfig(config) {
    this.config = config;
    localStorage.setItem('agent_workbench_config', JSON.stringify(config));
    this.addTimelineEvent('config', 'Configuration saved', 'success');
  }

  hasConfig() {
    return this.config && this.config.apiKey;
  }

  // UI State Management
  updateUI() {
    const hasConfig = this.hasConfig();
    const isConnected = this.isInitialized;

    // Main content visibility
    if (!hasConfig && !isConnected) {
      this.showEmptyState();
    } else if (isConnected) {
      this.showChatInterface();
    } else if (hasConfig) {
      // Has config but not connected yet - auto connect
      this.showChatInterface();
      this.connect();
    }

    // Update inspector
    this.updateInspector();
    
    // Update status
    this.updateConnectionStatus();
  }

  showEmptyState() {
    this.elements.emptyState.classList.remove('hidden');
    this.elements.chatContainer.classList.add('hidden');
    this.elements.inputArea.classList.add('hidden');
    this.elements.breadcrumbSession.textContent = 'Not Connected';
  }

  showChatInterface() {
    this.elements.emptyState.classList.add('hidden');
    this.elements.chatContainer.classList.remove('hidden');
    this.elements.inputArea.classList.remove('hidden');
    this.elements.breadcrumbSession.textContent = this.currentSessionId || 'Test Session';
  }

  // Connection Management
  async connect() {
    if (!this.config) {
      this.openSettings();
      return;
    }

    this.updateConnectionStatus('connecting');
    this.addTimelineEvent('worker', 'Initializing Web Worker...', 'info');

    try {
      // Terminate existing worker
      if (this.worker) {
        this.worker.terminate();
        this.addTimelineEvent('worker', 'Terminated previous worker', 'info');
      }

      // Create new worker as ES module
      this.worker = new Worker('../../../src/agent/worker.js', { type: 'module' });
      this.worker.onmessage = (e) => this.handleWorkerMessage(e);
      this.worker.onerror = (e) => {
        this.addTimelineEvent('worker', 'Worker error: ' + e.message, 'error');
        this.updateConnectionStatus('error');
      };

      // Send init message
      const initId = 'init-' + Date.now();
      this.pendingRequests.set(initId, { type: 'init', startTime: performance.now() });
      
      this.startTime = performance.now();
      this.worker.postMessage({
        type: 'init',
        id: initId,
        payload: {
          apiKey: this.config.apiKey,
          provider: this.config.provider,
          model: this.config.model,
          temperature: this.config.temperature,
          systemInstruction: "You are a helpful AI assistant. Answer questions directly and factually.",
          maxTokens: 4096,
          timeout: 30000,
          retries: 3
        }
      });

      this.addNetworkRequest({
        id: initId,
        type: 'INIT',
        status: 'pending',
        size: '-'
      });

    } catch (error) {
      this.addTimelineEvent('worker', 'Failed to connect: ' + error.message, 'error');
      this.updateConnectionStatus('error');
    }
  }

  disconnect() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.isInitialized = false;
    this.updateConnectionStatus('disconnected');
    this.addTimelineEvent('worker', 'Disconnected', 'info');
    this.updateUI();
  }

  // Worker Message Handler
  handleWorkerMessage(event) {
    const data = event.data;
    const timestamp = new Date().toLocaleTimeString();
    
    // Handle bridge message format
    if (data.type === 'bridge-message') {
      const eventName = data.event;
      const payload = data.data;
      
      // Update network request status
      if (payload?.id && this.pendingRequests.has(payload.id)) {
        const request = this.pendingRequests.get(payload.id);
        const duration = ((performance.now() - request.startTime) / 1000).toFixed(2) + 's';
        this.updateNetworkRequest(payload.id, { status: eventName, duration });
      }

      switch (eventName) {
        case 'ready':
          this.isInitialized = true;
          this.updateConnectionStatus('connected');
          this.addTimelineEvent('worker', 'Worker ready', 'success', {
            toolCount: payload?.toolCount || 0
          });
          if (!this.currentSessionId) {
            this.createSession();
          }
          this.updateUI();
          break;

        case 'step':
          this.handleStreamingMessage(payload);
          break;

        case 'response':
          this.handleResponse(payload);
          break;

        case 'error':
          this.addTimelineEvent('error', payload?.message || 'Unknown error', 'error', payload?.details);
          this.addMessage('error', payload?.message || 'Unknown error');
          break;

        case 'tool_pending':
          this.addTimelineEvent('tool', 'Tool execution pending: ' + payload?.tool?.name, 'warning');
          // Auto-approve for testing
          this.worker.postMessage({
            type: 'approve_tool',
            id: 'approve-' + Date.now(),
            payload: { toolId: payload?.toolId, approved: true }
          });
          break;

        case 'tool_result':
          this.addTimelineEvent('tool', 'Tool executed', 'success', payload);
          break;
      }
    } else if (data.type === 'ready') {
      // Handle legacy/direct ready message from MessageBridgeWorker._notifyReady()
      this.isInitialized = true;
      this.updateConnectionStatus('connected');
      this.addTimelineEvent('worker', 'Worker ready (bridge)', 'success');
      if (!this.currentSessionId) {
        this.createSession();
      }
      this.updateUI();
    }
  }

  handleStreamingMessage(payload) {
    if (payload.done) {
      // Finalize streaming
      if (this.currentStreamingMessage) {
        const el = document.getElementById(this.currentStreamingMessage);
        if (el) {
          el.querySelector('.message-text').classList.remove('streaming');
        }
        this.currentStreamingMessage = null;
      }
      
      // Update usage stats
      if (payload.usage) {
        this.elements.reqTokens.textContent = payload.usage.total || 0;
        this.addTimelineEvent('stream', 'Streaming complete', 'success', {
          tokens: payload.usage
        });
      }
    } else {
      // Append content
      if (!this.currentStreamingMessage) {
        this.currentStreamingMessage = this.addMessage('assistant', '');
      }
      
      const el = document.getElementById(this.currentStreamingMessage);
      if (el) {
        const textEl = el.querySelector('.message-text');
        textEl.textContent += payload.content;
        textEl.classList.add('streaming');
      }
      
      // Scroll to bottom
      this.elements.chatContainer.scrollTop = this.elements.chatContainer.scrollHeight;
    }
  }

  handleResponse(data) {
    const request = this.pendingRequests.get(data.id);
    if (request) {
      this.pendingRequests.delete(data.id);
      
      if (!data.success) {
        this.addTimelineEvent('response', 'Request failed: ' + data.error, 'error');
      }
    }
  }

  // Message Management
  sendMessage() {
    const input = this.elements.messageInput;
    const content = input.value.trim();
    
    if (!content || !this.isInitialized) return;

    // Add user message
    this.addMessage('user', content);
    
    // Clear input
    input.value = '';
    input.style.height = 'auto';
    this.elements.sendBtn.disabled = true;

    // Send to worker
    const chatId = 'chat-' + Date.now();
    this.pendingRequests.set(chatId, { 
      type: 'chat', 
      startTime: performance.now() 
    });

    this.worker.postMessage({
      type: 'chat',
      id: chatId,
      payload: {
        message: content,
        sessionId: this.currentSessionId || 'test-session'
      }
    });

    this.addNetworkRequest({
      id: chatId,
      type: 'CHAT',
      status: 'pending',
      size: content.length + ' chars'
    });

    this.addTimelineEvent('chat', 'Message sent', 'info', { 
      preview: content.substring(0, 50) 
    });

    this.updateInspector();
  }

  addMessage(role, content) {
    const id = 'msg-' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = 'message';
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    div.innerHTML = `
      <div class="message-avatar ${role}">${role === 'user' ? 'U' : 'AI'}</div>
      <div class="message-content">
        <div class="message-header">
          <span class="message-author">${role === 'user' ? 'You' : 'Assistant'}</span>
          <span class="message-time">${time}</span>
        </div>
        <div class="message-text">${content}</div>
      </div>
    `;
    
    this.elements.chatContainer.appendChild(div);
    this.elements.chatContainer.scrollTop = this.elements.chatContainer.scrollHeight;
    
    this.messages.push({ id, role, content, time });
    this.updateInspector();
    
    return id;
  }

  // Session Management
  createSession() {
    const id = 'session-' + Date.now();
    const session = {
      id,
      name: 'Test Session',
      created: new Date(),
      messageCount: 0
    };
    
    this.sessions.push(session);
    this.currentSessionId = id;
    this.renderSessionList();
    this.addTimelineEvent('session', 'New session created', 'info', { id });
  }

  renderSessionList() {
    const list = this.elements.sessionList;
    list.innerHTML = '';
    
    this.sessions.forEach(session => {
      const div = document.createElement('div');
      div.className = 'session-item' + (session.id === this.currentSessionId ? ' active' : '');
      div.innerHTML = `
        <svg class="session-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
        </svg>
        <div class="session-info">
          <div class="session-name">${session.name}</div>
          <div class="session-meta">${session.messageCount} messages</div>
        </div>
      `;
      div.onclick = () => this.switchSession(session.id);
      list.appendChild(div);
    });
  }

  switchSession(id) {
    this.currentSessionId = id;
    this.renderSessionList();
    this.elements.breadcrumbSession.textContent = 'Test Session';
  }

  // Inspector Updates
  updateInspector() {
    if (!this.config) return;
    
    // Request tab
    this.elements.reqProvider.textContent = this.config.provider || '-';
    this.elements.reqModel.textContent = this.config.model || '-';
    this.elements.reqTemp.textContent = this.config.temperature || '-';
    
    // Context tab
    this.elements.ctxState.textContent = this.isInitialized ? 'Active' : 'Inactive';
    this.elements.ctxMessages.textContent = this.messages.length;
    this.elements.ctxPending.textContent = this.pendingRequests.size;
  }

  // Timeline & Logging
  addTimelineEvent(category, message, type = 'info', meta = null) {
    const event = {
      id: 'event-' + Date.now(),
      timestamp: new Date(),
      category,
      message,
      type,
      meta
    };
    
    this.timeline.push(event);
    this.renderTimeline();
    this.elements.timelineBadge.textContent = this.timeline.length;
    
    // Also add to console
    console.log(`[${category}] ${message}`, meta);
  }

  renderTimeline() {
    const list = this.elements.timelineList;
    list.innerHTML = '';
    
    this.timeline.slice(-50).forEach(event => {
      const time = event.timestamp.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });
      
      const div = document.createElement('div');
      div.className = `timeline-item ${event.type}`;
      div.innerHTML = `
        <div class="timeline-time">${time}</div>
        <div class="timeline-content">
          <div>${event.message}</div>
          ${event.meta ? `<div class="timeline-meta">${JSON.stringify(event.meta).substring(0, 100)}</div>` : ''}
        </div>
      `;
      list.appendChild(div);
    });
    
    list.scrollTop = list.scrollHeight;
  }

  // Network Requests
  addNetworkRequest(request) {
    this.networkRequests.push(request);
    this.renderNetworkTable();
    this.elements.networkBadge.textContent = this.networkRequests.length;
  }

  updateNetworkRequest(id, updates) {
    const request = this.networkRequests.find(r => r.id === id);
    if (request) {
      Object.assign(request, updates);
      this.renderNetworkTable();
    }
  }

  renderNetworkTable() {
    const tbody = this.elements.networkTableBody;
    tbody.innerHTML = '';
    
    this.networkRequests.slice(-20).reverse().forEach(req => {
      const row = document.createElement('tr');
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      let statusColor = '';
      if (req.status === 'ready' || req.status === 'done') statusColor = 'color: var(--accent-green)';
      else if (req.status === 'error') statusColor = 'color: var(--accent-red)';
      else statusColor = 'color: var(--accent-orange)';
      
      row.innerHTML = `
        <td>${time}</td>
        <td><span class="method-badge post">${req.type}</span></td>
        <td style="${statusColor}">${req.status}</td>
        <td>${req.size}</td>
      `;
      tbody.appendChild(row);
    });
  }

  // Connection Status
  updateConnectionStatus(status) {
    const dot = this.elements.statusDot;
    const text = this.elements.statusText;
    
    dot.className = 'status-dot';
    
    switch (status) {
      case 'connected':
        dot.classList.add('connected');
        text.textContent = 'Connected';
        break;
      case 'connecting':
        dot.classList.add('connecting');
        text.textContent = 'Connecting...';
        break;
      case 'error':
        dot.classList.add('disconnected');
        text.textContent = 'Error';
        break;
      default:
        dot.classList.add('disconnected');
        text.textContent = 'Disconnected';
    }
  }

  // Event Listeners
  setupEventListeners() {
    // Connection
    this.elements.connectBtn?.addEventListener('click', () => this.connect());
    this.elements.connectionStatus?.addEventListener('click', () => this.openSettings());
    
    // Settings modal
    this.elements.settingsBtn?.addEventListener('click', () => this.openSettings());
    this.elements.closeSettings?.addEventListener('click', () => this.closeSettings());
    this.elements.cancelSettings?.addEventListener('click', () => this.closeSettings());
    this.elements.saveSettings?.addEventListener('click', () => this.saveSettings());
    
    // Message input
    this.elements.messageInput?.addEventListener('input', (e) => {
      e.target.style.height = 'auto';
      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
      this.elements.sendBtn.disabled = !e.target.value.trim();
    });
    
    this.elements.messageInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    
    this.elements.sendBtn?.addEventListener('click', () => this.sendMessage());
    
    // Mode switcher
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchMode(btn.dataset.mode));
    });
    
    // Inspector tabs
    document.querySelectorAll('.inspector-tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchInspectorTab(tab.dataset.tab));
    });
    
    // Bottom panel tabs
    document.querySelectorAll('.bottom-tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchBottomPanel(tab.dataset.panel));
    });
    
    // Panel controls
    document.getElementById('togglePanelBtn')?.addEventListener('click', () => {
      this.elements.bottomPanel.classList.toggle('collapsed');
    });
    
    document.getElementById('clearLogsBtn')?.addEventListener('click', () => {
      this.timeline = [];
      this.networkRequests = [];
      this.renderTimeline();
      this.renderNetworkTable();
    });
    
    // New session
    document.getElementById('newSessionBtn')?.addEventListener('click', () => {
      this.createSession();
    });
    
    // Modal overlay click to close
    this.elements.settingsModal?.addEventListener('click', (e) => {
      if (e.target === this.elements.settingsModal) {
        this.closeSettings();
      }
    });
    
    // Test Suite
    this.setupTestSuiteListeners();
  }

  // Settings
  openSettings() {
    if (this.config) {
      this.elements.modalApiKey.value = this.config.apiKey || '';
      this.elements.modalProvider.value = this.config.provider || 'gemini';
      this.elements.modalModel.value = this.config.model || 'gemini-2.5-flash';
      this.elements.modalTemp.value = this.config.temperature || 0.7;
    }
    this.elements.settingsModal.classList.add('active');
  }

  closeSettings() {
    this.elements.settingsModal.classList.remove('active');
  }

  saveSettings() {
    const config = {
      apiKey: this.elements.modalApiKey.value.trim(),
      provider: this.elements.modalProvider.value,
      model: this.elements.modalModel.value,
      temperature: parseFloat(this.elements.modalTemp.value)
    };
    
    if (!config.apiKey) {
      alert('API key is required');
      return;
    }
    
    this.saveConfig(config);
    this.closeSettings();
    this.connect();
  }

  // Mode Switching
  switchMode(mode) {
    this.currentMode = mode;
    
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    
    this.addTimelineEvent('ui', `Switched to ${mode} mode`, 'info');
  }

  // Inspector Tabs
  switchInspectorTab(tab) {
    document.querySelectorAll('.inspector-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });
    
    this.elements.requestPanel?.classList.toggle('hidden', tab !== 'request');
    this.elements.contextPanel?.classList.toggle('hidden', tab !== 'context');
  }

  // Bottom Panel
  switchBottomPanel(panel) {
    document.querySelectorAll('.bottom-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.panel === panel);
    });
    
    document.querySelectorAll('.panel-view').forEach(v => {
      v.classList.toggle('hidden', v.id !== panel + 'View');
    });
    
    this.elements.bottomPanel.classList.remove('collapsed');
  }

  // Keyboard Shortcuts
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Cmd/Ctrl + K - Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.toggleCommandPalette();
      }
      
      // Cmd/Ctrl + , - Settings
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        this.openSettings();
      }
      
      // Cmd/Ctrl + Enter - Send message
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && this.isInitialized) {
        this.sendMessage();
      }
      
      // Escape - Close modals
      if (e.key === 'Escape') {
        this.closeSettings();
        this.elements.commandPalette.classList.remove('active');
      }
      
      // Cmd/Ctrl + D - Toggle bottom panel
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        this.elements.bottomPanel.classList.toggle('collapsed');
      }
    });
  }

  // Command Palette
  toggleCommandPalette() {
    const palette = this.elements.commandPalette;
    const isActive = palette.classList.contains('active');
    
    if (isActive) {
      palette.classList.remove('active');
    } else {
      palette.classList.add('active');
      this.elements.paletteInput.value = '';
      this.elements.paletteInput.focus();
      this.renderCommandPalette('');
    }
  }

  renderCommandPalette(query) {
    const commands = [
      { id: 'connect', title: 'Connect to Worker', subtitle: 'Initialize Web Worker connection', shortcut: 'Ctrl+C' },
      { id: 'disconnect', title: 'Disconnect', subtitle: 'Terminate worker connection', shortcut: 'Ctrl+Shift+D' },
      { id: 'settings', title: 'Open Settings', subtitle: 'Configure API and model', shortcut: 'Ctrl+,' },
      { id: 'new-session', title: 'New Session', subtitle: 'Create a new chat session', shortcut: 'Ctrl+N' },
      { id: 'clear-chat', title: 'Clear Chat', subtitle: 'Remove all messages', shortcut: 'Ctrl+Shift+K' },
      { id: 'toggle-panel', title: 'Toggle Bottom Panel', subtitle: 'Show/hide debug panel', shortcut: 'Ctrl+D' },
    ];
    
    const filtered = commands.filter(c => 
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.subtitle.toLowerCase().includes(query.toLowerCase())
    );
    
    const list = this.elements.paletteList;
    list.innerHTML = '';
    
    filtered.forEach((cmd, index) => {
      const div = document.createElement('div');
      div.className = 'palette-item' + (index === 0 ? ' selected' : '');
      div.innerHTML = `
        <svg class="palette-item-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
        <div class="palette-item-content">
          <div class="palette-item-title">${cmd.title}</div>
          <div class="palette-item-subtitle">${cmd.subtitle}</div>
        </div>
        <div class="palette-shortcut">${cmd.shortcut}</div>
      `;
      div.onclick = () => this.executeCommand(cmd.id);
      list.appendChild(div);
    });
  }

  executeCommand(id) {
    this.elements.commandPalette.classList.remove('active');
    
    switch (id) {
      case 'connect': this.connect(); break;
      case 'disconnect': this.disconnect(); break;
      case 'settings': this.openSettings(); break;
      case 'new-session': this.createSession(); break;
      case 'clear-chat': 
        this.elements.chatContainer.innerHTML = '';
        this.messages = [];
        break;
      case 'toggle-panel':
        this.elements.bottomPanel.classList.toggle('collapsed');
        break;
    }
  }

  // Test Suite Methods
  setupTestSuiteListeners() {
    document.querySelectorAll('.test-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const testName = btn.dataset.test;
        this.runTest(testName, btn);
      });
    });
  }

  async runTest(testName, btnElement) {
    if (!this.isInitialized) {
      this.showNotification('Please connect first', 'error');
      return;
    }

    // Set running state
    btnElement.classList.add('running');
    btnElement.classList.remove('success', 'error');
    
    this.addTimelineEvent('test', `Starting test: ${testName}`, 'info');
    
    try {
      switch (testName) {
        case 'connectivity':
          await this.testConnectivity();
          break;
        case 'streaming':
          await this.testStreaming();
          break;
        case 'conversation':
          await this.testConversation();
          break;
        case 'tools':
          await this.testTools();
          break;
        case 'errors':
          await this.testErrors();
          break;
        case 'stress':
          await this.testStress();
          break;
        case 'all':
          await this.runAllTests();
          return; // runAllTests handles its own cleanup
      }
      
      // Mark as success
      btnElement.classList.remove('running');
      btnElement.classList.add('success');
      this.addTimelineEvent('test', `Test passed: ${testName}`, 'success');
      
    } catch (error) {
      // Mark as error
      btnElement.classList.remove('running');
      btnElement.classList.add('error');
      this.addTimelineEvent('test', `Test failed: ${testName} - ${error.message}`, 'error');
    }
  }

  async testConnectivity() {
    // Simple connectivity test - worker is already connected if we got here
    // Just verify we can ping the worker
    const pingId = 'ping-' + Date.now();
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Ping timeout'));
      }, 5000);
      
      const handler = (event) => {
        const data = event.data;
        if (data.type === 'bridge-message' && data.event === 'response' && data.data?.id === pingId) {
          clearTimeout(timeout);
          this.worker.removeEventListener('message', handler);
          resolve();
        }
      };
      
      this.worker.addEventListener('message', handler);
      this.worker.postMessage({
        type: 'chat',
        id: pingId,
        payload: {
          message: 'Hello',
          sessionId: 'test-session'
        }
      });
    });
  }

  async testStreaming() {
    this.addMessage('user', '[TEST] Testing streaming response...');
    
    return new Promise((resolve, reject) => {
      let receivedChunks = 0;
      let completed = false;
      
      const timeout = setTimeout(() => {
        if (!completed) {
          reject(new Error('Streaming timeout - no completion received'));
        }
      }, 30000);
      
      const originalHandler = this.worker.onmessage;
      
      const testHandler = (event) => {
        const data = event.data;
        
        if (data.type === 'bridge-message') {
          if (data.event === 'step') {
            receivedChunks++;
            this.addTimelineEvent('test', `Received chunk #${receivedChunks}`, 'info');
            
            if (data.data?.done) {
              completed = true;
              clearTimeout(timeout);
              this.worker.onmessage = originalHandler;
              
              if (receivedChunks > 0) {
                this.addMessage('assistant', `[TEST RESULT] Streaming test passed. Received ${receivedChunks} chunks.`);
                resolve();
              } else {
                reject(new Error('No chunks received'));
              }
            }
          }
        }
      };
      
      this.worker.onmessage = testHandler;
      this.worker.postMessage({
        type: 'chat',
        id: 'streaming-test',
        payload: {
          message: 'Count from 1 to 5, one number per line',
          sessionId: 'test-session'
        }
      });
    });
  }

  async testConversation() {
    const messages = [
      'What is 2+2?',
      'Now multiply that by 3',
      'What was the original question?'
    ];
    
    this.addMessage('user', '[TEST] Starting multi-turn conversation test...');
    
    for (let i = 0; i < messages.length; i++) {
      await this.sendTestMessage(messages[i], `conversation-${i}`);
      await this.delay(2000); // Wait between messages
    }
    
    this.addMessage('assistant', '[TEST RESULT] Conversation test completed');
  }

  async testTools() {
    this.addMessage('user', '[TEST] Testing tool execution...');
    
    return new Promise((resolve, reject) => {
      let toolPendingReceived = false;
      let toolResultReceived = false;
      
      const timeout = setTimeout(() => {
        reject(new Error(`Tool test timeout. Pending: ${toolPendingReceived}, Result: ${toolResultReceived}`));
      }, 15000);
      
      const originalHandler = this.worker.onmessage;
      
      const testHandler = (event) => {
        const data = event.data;
        
        if (data.type === 'bridge-message') {
          if (data.event === 'tool_pending') {
            toolPendingReceived = true;
            this.addTimelineEvent('test', 'Tool pending received', 'info');
          }
          
          if (data.event === 'tool_result') {
            toolResultReceived = true;
            clearTimeout(timeout);
            this.worker.onmessage = originalHandler;
            this.addMessage('assistant', '[TEST RESULT] Tool execution test passed');
            resolve();
          }
        }
      };
      
      this.worker.onmessage = testHandler;
      this.worker.postMessage({
        type: 'approve_tool',
        id: 'tool-test',
        payload: {
          toolId: 'test-tool',
          approved: true
        }
      });
      
      // Also trigger a chat that might use tools
      this.worker.postMessage({
        type: 'chat',
        id: 'chat-tool-test',
        payload: {
          message: 'Use any available tool',
          sessionId: 'test-session'
        }
      });
    });
  }

  async testErrors() {
    this.addMessage('user', '[TEST] Testing error handling...');
    
    // Test 1: Invalid message format
    this.worker.postMessage({
      type: 'invalid_type',
      id: 'error-test-1'
    });
    
    await this.delay(1000);
    
    // Test 2: Missing required fields
    this.worker.postMessage({
      type: 'chat',
      id: 'error-test-2',
      payload: {
        // missing sessionId
        message: 'test'
      }
    });
    
    await this.delay(1000);
    
    this.addMessage('assistant', '[TEST RESULT] Error handling test completed - check timeline for error events');
  }

  async testStress() {
    const concurrentRequests = 5;
    this.addMessage('user', `[TEST] Sending ${concurrentRequests} concurrent requests...`);
    
    const promises = [];
    
    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(this.sendTestMessage(`Concurrent request ${i + 1}`, `stress-${i}`));
    }
    
    await Promise.all(promises);
    
    this.addMessage('assistant', '[TEST RESULT] Stress test completed - all requests sent');
  }

  async runAllTests() {
    const tests = ['connectivity', 'streaming', 'conversation', 'tools', 'errors', 'stress'];
    const buttons = document.querySelectorAll('.test-btn[data-test]');
    
    this.addMessage('user', '[TEST SUITE] Starting comprehensive test suite...');
    
    for (const testName of tests) {
      const btn = Array.from(buttons).find(b => b.dataset.test === testName);
      if (btn) {
        await this.runTest(testName, btn);
        await this.delay(3000); // Wait between tests
      }
    }
    
    this.addMessage('assistant', '[TEST SUITE] All tests completed!');
  }

  sendTestMessage(message, id) {
    return new Promise((resolve) => {
      const handler = (event) => {
        const data = event.data;
        if (data.type === 'bridge-message' && data.event === 'response' && data.data?.id === id) {
          this.worker.removeEventListener('message', handler);
          resolve(data.data);
        }
      };
      
      this.worker.addEventListener('message', handler);
      this.worker.postMessage({
        type: 'chat',
        id: id,
        payload: {
          message,
          sessionId: 'test-session'
        }
      });
    });
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
