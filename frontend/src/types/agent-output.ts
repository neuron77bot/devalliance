export type OutputType = 'output' | 'progress' | 'tool_call' | 'error' | 'result';

export interface AgentOutput {
  _id: string;
  agentId: string;
  taskId?: string;
  type: OutputType;
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface AgentStatus {
  agentId: string;
  status: 'healthy' | 'offline' | 'error';
  containerRunning: boolean;
  gatewayConnected: boolean;
  metrics?: {
    cpu?: number;
    memory?: number;
    uptime?: number;
  };
  responseTime?: number;
  lastSync: string;
}
