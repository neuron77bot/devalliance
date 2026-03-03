export type AgentStatus = 'healthy' | 'warning' | 'error' | 'offline';

export interface Gateway {
  url: string;
  port: number;
}

export interface AgentMetrics {
  uptime: number; // seconds
  tasksCompleted: number;
  avgResponseTime: number; // milliseconds
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  status: AgentStatus;
  capabilities: string[];
  gateway: Gateway;
  metrics: AgentMetrics;
  telegram?: {
    enabled: boolean;
    botUsername?: string;
  };
}

export interface Task {
  id: string;
  agentId: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
}

export interface SystemStatus {
  totalAgents: number;
  activeAgents: number;
  totalTasks: number;
  completedTasks: number;
  avgResponseTime: number;
}
