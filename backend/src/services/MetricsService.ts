import { AgentModel } from '../models/Agent.model';
import { TaskModel } from '../models/Task.model';
import { ActivityModel } from '../models/Activity.model';

export interface SystemMetrics {
  totalAgents: number;
  activeAgents: number;
  inactiveAgents: number;
  totalTasks: number;
  tasksCompletedToday: number;
  tasksPending: number;
  tasksInProgress: number;
  tasksFailed: number;
  avgResponseTime: number;
  timestamp: Date;
}

export interface AgentMetrics {
  agentId: string;
  agentName: string;
  status: 'online' | 'offline' | 'error';
  cpu: number;
  memory: number;
  uptime: number;
  avgResponseTime: number;
  tasksCompleted: number;
  tasksFailed: number;
  lastActivity?: Date;
  history: {
    timestamp: Date;
    cpu: number;
    memory: number;
    responseTime: number;
  }[];
}

export interface ResponseTimeData {
  timestamp: Date;
  avgResponseTime: number;
}

export class MetricsService {
  // Cache para métricas de agentes (simula datos en tiempo real)
  private agentMetricsCache: Map<string, AgentMetrics> = new Map();
  private responseTimeHistory: ResponseTimeData[] = [];
  
  constructor() {
    // Inicializar historial de response time
    this.initializeResponseTimeHistory();
    // Actualizar métricas cada 5 segundos
    setInterval(() => this.updateAgentMetrics(), 5000);
  }

  /**
   * Inicializa historial de response time con datos mock
   */
  private initializeResponseTimeHistory() {
    const now = Date.now();
    for (let i = 60; i >= 0; i--) {
      this.responseTimeHistory.push({
        timestamp: new Date(now - i * 60000), // Últimos 60 minutos
        avgResponseTime: this.generateResponseTime()
      });
    }
  }

  /**
   * Genera valores realistas de response time
   */
  private generateResponseTime(): number {
    return Math.floor(Math.random() * 450) + 50; // 50-500ms
  }

  /**
   * Genera CPU usage realista
   */
  private generateCPU(): number {
    return Math.floor(Math.random() * 70) + 10; // 10-80%
  }

  /**
   * Genera Memory usage realista
   */
  private generateMemory(): number {
    return Math.floor(Math.random() * 400) + 100; // 100-500 MB
  }

  /**
   * Actualiza métricas de agentes (simula actividad en tiempo real)
   */
  private async updateAgentMetrics() {
    const agents = await AgentModel.find();
    
    for (const agent of agents) {
      let metrics = this.agentMetricsCache.get(agent.id);
      
      if (!metrics) {
        // Crear métricas iniciales
        metrics = {
          agentId: agent.id,
          agentName: agent.name,
          status: 'online',
          cpu: this.generateCPU(),
          memory: this.generateMemory(),
          uptime: Math.floor(Math.random() * 86400000), // 0-24h
          avgResponseTime: this.generateResponseTime(),
          tasksCompleted: 0,
          tasksFailed: 0,
          history: []
        };
      }
      
      // Actualizar valores
      metrics.cpu = this.generateCPU();
      metrics.memory = this.generateMemory();
      metrics.avgResponseTime = this.generateResponseTime();
      metrics.uptime += 5000; // Incrementar uptime
      
      // Agregar a historial (mantener últimos 60 puntos)
      metrics.history.push({
        timestamp: new Date(),
        cpu: metrics.cpu,
        memory: metrics.memory,
        responseTime: metrics.avgResponseTime
      });
      
      if (metrics.history.length > 60) {
        metrics.history.shift();
      }
      
      this.agentMetricsCache.set(agent.id, metrics);
    }
    
    // Actualizar historial de response time global
    this.responseTimeHistory.push({
      timestamp: new Date(),
      avgResponseTime: this.generateResponseTime()
    });
    
    if (this.responseTimeHistory.length > 60) {
      this.responseTimeHistory.shift();
    }
  }

  /**
   * Obtiene métricas globales del sistema
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    const totalAgents = await AgentModel.countDocuments();
    
    // Por ahora, todos los agentes están "activos" (mock)
    const activeAgents = totalAgents;
    const inactiveAgents = 0;
    
    const totalTasks = await TaskModel.countDocuments();
    
    // Tasks completadas hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tasksCompletedToday = await TaskModel.countDocuments({
      status: 'completed',
      updatedAt: { $gte: today }
    });
    
    const tasksPending = await TaskModel.countDocuments({ status: 'pending' });
    const tasksInProgress = await TaskModel.countDocuments({ status: 'in-progress' });
    const tasksFailed = await TaskModel.countDocuments({ status: 'failed' });
    
    // Calcular response time promedio de todos los agentes
    let totalResponseTime = 0;
    let agentCount = 0;
    
    for (const metrics of this.agentMetricsCache.values()) {
      totalResponseTime += metrics.avgResponseTime;
      agentCount++;
    }
    
    const avgResponseTime = agentCount > 0 
      ? Math.round(totalResponseTime / agentCount) 
      : this.generateResponseTime();
    
    return {
      totalAgents,
      activeAgents,
      inactiveAgents,
      totalTasks,
      tasksCompletedToday,
      tasksPending,
      tasksInProgress,
      tasksFailed,
      avgResponseTime,
      timestamp: new Date()
    };
  }

  /**
   * Obtiene métricas de un agente específico
   */
  async getAgentMetrics(agentId: string): Promise<AgentMetrics | null> {
    const agent = await AgentModel.findOne({ id: agentId });
    if (!agent) return null;
    
    let metrics = this.agentMetricsCache.get(agentId);
    
    if (!metrics) {
      // Crear métricas si no existen
      metrics = {
        agentId: agent.id,
        agentName: agent.name,
        status: 'online',
        cpu: this.generateCPU(),
        memory: this.generateMemory(),
        uptime: Math.floor(Math.random() * 86400000),
        avgResponseTime: this.generateResponseTime(),
        tasksCompleted: 0,
        tasksFailed: 0,
        history: []
      };
      this.agentMetricsCache.set(agentId, metrics);
    }
    
    // Obtener stats de tasks
    const tasksCompleted = await TaskModel.countDocuments({
      assignedTo: agentId,
      status: 'completed'
    });
    
    const tasksFailed = await TaskModel.countDocuments({
      assignedTo: agentId,
      status: 'failed'
    });
    
    // Última actividad del agente
    const lastActivity = await ActivityModel.findOne({ agentId })
      .sort({ timestamp: -1 })
      .select('timestamp');
    
    metrics.tasksCompleted = tasksCompleted;
    metrics.tasksFailed = tasksFailed;
    metrics.lastActivity = lastActivity?.timestamp;
    
    return metrics;
  }

  /**
   * Obtiene métricas de todos los agentes
   */
  async getAllAgentMetrics(): Promise<AgentMetrics[]> {
    const agents = await AgentModel.find();
    const metricsPromises = agents.map(agent => this.getAgentMetrics(agent.id));
    const metrics = await Promise.all(metricsPromises);
    return metrics.filter(m => m !== null) as AgentMetrics[];
  }

  /**
   * Obtiene historial de response time
   */
  getResponseTimeHistory(): ResponseTimeData[] {
    return this.responseTimeHistory;
  }

  /**
   * Registra actividad del sistema
   */
  async logActivity(
    type: string,
    message: string,
    level: 'info' | 'warning' | 'error' | 'success' = 'info',
    metadata?: any
  ): Promise<void> {
    await ActivityModel.create({
      type,
      message,
      level,
      metadata,
      timestamp: new Date()
    });
  }
}

// Singleton instance
export const metricsService = new MetricsService();
