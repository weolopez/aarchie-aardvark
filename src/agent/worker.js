// src/agent/worker.js - Worker entry point and message handling
import { MessageBridgeWorker } from '../../components/core/message-bridge/src/index.js';
import { EventBus } from '../../components/core/event-bus/src/index.js';
import { Agent } from './agent.js';
import { Protocol } from './protocol.js';

class WorkerController {
  constructor() {
    console.log('[WorkerController] Initializing...');
    this.eventBus = new EventBus();
    this.messageBridge = new MessageBridgeWorker({
      eventBus: this.eventBus,
      forwardEvents: ['step', 'tool_pending', 'tool_result', 'error', 'ready', 'response'],
      receiveEvents: ['init', 'chat', 'approve_tool', 'load_repo']
    });
    this.agent = new Agent();
    this.protocol = new Protocol(this);
  }

  async start() {
    console.log('[WorkerController] start() called');
    // Set up message handlers
    this.eventBus.subscribe('init', (data) => { console.log('[WorkerController] eventBus received init:', data); this.protocol.handleInit(data); });
    this.eventBus.subscribe('chat', (data) => { console.log('[WorkerController] eventBus received chat:', data); this.protocol.handleChat(data); });
    this.eventBus.subscribe('approve_tool', (data) => { console.log('[WorkerController] eventBus received approve_tool:', data); this.protocol.handleApproveTool(data); });
    this.eventBus.subscribe('load_repo', (data) => { console.log('[WorkerController] eventBus received load_repo:', data); this.protocol.handleLoadRepo(data); });

    // Start bridge
    this.messageBridge.start();

    // Signal ready
    this.messageBridge.send('ready', { toolCount: 0 });
    console.log('[WorkerController] Ready sent');
  }
}

// Initialize worker
const controller = new WorkerController();
controller.start();
