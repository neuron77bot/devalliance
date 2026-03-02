export type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type InteractionType = 
  | 'comment' 
  | 'handoff_request' 
  | 'handoff_accept' 
  | 'handoff_reject' 
  | 'status_change' 
  | 'assignment'
  | 'collaboration_invite'
  | 'collaboration_accept'
  | 'collaboration_reject';

export interface TaskMetadata {
  notes?: string;
  attachments?: string[];
}

export interface Task {
  _id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo?: string; // agentId
  createdBy?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  estimatedDuration?: number; // minutes
  actualDuration?: number; // minutes
  tags: string[];
  dependencies: string[]; // task IDs
  metadata: TaskMetadata;
  updatedAt: string;
}

export interface Interaction {
  _id: string;
  taskId: string;
  type: InteractionType;
  fromAgent?: string;
  toAgent?: string;
  message?: string;
  timestamp: string;
  metadata?: any;
}

export interface TaskStats {
  total: number;
  byStatus: {
    pending: number;
    assigned: number;
    in_progress: number;
    paused: number;
    completed: number;
    failed: number;
    cancelled: number;
  };
  byPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  avgCompletionTime: number | null;
}

export interface AgentWorkload {
  agentId: string;
  inProgressCount: number;
  assignedCount: number;
  totalLoad: number;
  status: 'available' | 'busy' | 'overloaded';
}

export interface QueueStats {
  queue: {
    pending: number;
    assigned: number;
    inProgress: number;
    paused: number;
    total: number;
  };
  agents: AgentWorkload[];
}

export interface CreateTaskInput {
  title: string;
  description: string;
  priority?: TaskPriority;
  assignedTo?: string;
  createdBy?: string;
  estimatedDuration?: number;
  tags?: string[];
  dependencies?: string[];
  metadata?: TaskMetadata;
  autoAssign?: boolean;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedTo?: string;
  estimatedDuration?: number;
  tags?: string[];
  dependencies?: string[];
  metadata?: TaskMetadata;
}

export interface HandoffRequest {
  toAgent: string;
  message?: string;
}

export interface CommentInput {
  message: string;
  fromAgent?: string;
}

export interface StatusChangeInput {
  status: TaskStatus;
  reason?: string;
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedTo?: string;
  tags?: string[];
  search?: string;
  limit?: number;
  skip?: number;
}
