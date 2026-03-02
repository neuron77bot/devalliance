import type { Agent, Task, SystemStatus } from '../types/api';

export const mockAgents: Agent[] = [
  {
    id: 'arquitecto',
    name: 'Arquitecto',
    role: 'Architecture & Design',
    description: 'Agente especializado en arquitectura de software y diseño de sistemas',
    status: 'healthy',
    capabilities: [
      'System Design',
      'Architecture Planning',
      'Tech Stack Selection',
      'Database Design',
      'API Design'
    ],
    gateway: {
      url: 'ws://openclaw-arquitecto:18789',
      port: 18789
    },
    metrics: {
      uptime: 7200,
      tasksCompleted: 42,
      avgResponseTime: 245
    }
  },
  {
    id: 'developer',
    name: 'Developer',
    role: 'Implementation & Coding',
    description: 'Agente especializado en desarrollo e implementación de código',
    status: 'healthy',
    capabilities: [
      'Code Implementation',
      'Testing',
      'Debugging',
      'Code Review',
      'Refactoring'
    ],
    gateway: {
      url: 'ws://openclaw-developer:18789',
      port: 18791
    },
    metrics: {
      uptime: 7200,
      tasksCompleted: 38,
      avgResponseTime: 320
    }
  },
  {
    id: 'devops',
    name: 'DevOps',
    role: 'Infrastructure & Deployment',
    description: 'Agente especializado en infraestructura, CI/CD y deployment',
    status: 'warning',
    capabilities: [
      'Docker',
      'CI/CD',
      'Monitoring',
      'Cloud Infrastructure',
      'Security'
    ],
    gateway: {
      url: 'ws://openclaw-devops:18789',
      port: 18792
    },
    metrics: {
      uptime: 5400,
      tasksCompleted: 28,
      avgResponseTime: 180
    }
  },
  {
    id: 'qa',
    name: 'QA Engineer',
    role: 'Quality Assurance',
    description: 'Agente especializado en testing y aseguramiento de calidad',
    status: 'healthy',
    capabilities: [
      'Automated Testing',
      'Manual Testing',
      'Performance Testing',
      'Security Testing',
      'Test Planning'
    ],
    gateway: {
      url: 'ws://openclaw-qa:18789',
      port: 18793
    },
    metrics: {
      uptime: 7200,
      tasksCompleted: 51,
      avgResponseTime: 195
    }
  },
  {
    id: 'coordinator',
    name: 'Coordinator',
    role: 'Project Management',
    description: 'Agente coordinador de proyectos y tareas del equipo',
    status: 'offline',
    capabilities: [
      'Task Assignment',
      'Progress Tracking',
      'Team Coordination',
      'Reporting',
      'Planning'
    ],
    gateway: {
      url: 'ws://openclaw-coordinator:18789',
      port: 18794
    },
    metrics: {
      uptime: 0,
      tasksCompleted: 15,
      avgResponseTime: 0
    }
  }
];

export const mockTasks: Task[] = [
  {
    id: 'task-1',
    agentId: 'arquitecto',
    title: 'Diseñar arquitectura del sistema de autenticación',
    description: 'Crear diagrama de arquitectura para el nuevo sistema de auth',
    status: 'completed',
    createdAt: '2026-03-01T10:00:00Z',
    completedAt: '2026-03-01T12:30:00Z'
  },
  {
    id: 'task-2',
    agentId: 'developer',
    title: 'Implementar endpoints de API REST',
    description: 'Desarrollar endpoints para CRUD de usuarios',
    status: 'running',
    createdAt: '2026-03-02T09:00:00Z'
  },
  {
    id: 'task-3',
    agentId: 'qa',
    title: 'Tests de integración para API',
    description: 'Crear suite de tests de integración',
    status: 'pending',
    createdAt: '2026-03-02T11:00:00Z'
  }
];

export const mockSystemStatus: SystemStatus = {
  totalAgents: 5,
  activeAgents: 3,
  totalTasks: 159,
  completedTasks: 174,
  avgResponseTime: 235
};
