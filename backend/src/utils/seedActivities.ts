import { ActivityModel } from '../models/Activity.model';
import { AgentModel } from '../models/Agent.model';
import { TaskModel } from '../models/Task.model';

/**
 * Seed de actividades iniciales para demostración
 */
export async function seedActivities() {
  try {
    // Verificar si ya hay actividades
    const count = await ActivityModel.countDocuments();
    if (count > 0) {
      console.log('✓ Activities already seeded, skipping...');
      return;
    }

    console.log('🌱 Seeding initial activities...');

    const agents = await AgentModel.find().limit(3);
    const tasks = await TaskModel.find().limit(5);

    const activities = [];
    const now = Date.now();

    // Generar actividades de las últimas 2 horas
    for (let i = 0; i < 20; i++) {
      const minutesAgo = Math.floor(Math.random() * 120); // 0-120 minutos
      const timestamp = new Date(now - minutesAgo * 60 * 1000);

      const activityTypes = [
        {
          type: 'agent_started',
          message: `Agent ${agents[i % agents.length]?.name || 'Unknown'} started successfully`,
          level: 'success' as const,
          agentId: agents[i % agents.length]?.id
        },
        {
          type: 'task_created',
          message: `New task created: ${tasks[i % tasks.length]?.title || 'Sample task'}`,
          level: 'info' as const,
          taskId: tasks[i % tasks.length]?._id.toString()
        },
        {
          type: 'task_completed',
          message: `Task completed successfully`,
          level: 'success' as const,
          taskId: tasks[i % tasks.length]?._id.toString(),
          agentId: agents[i % agents.length]?.id
        },
        {
          type: 'system_event',
          message: 'System health check passed',
          level: 'info' as const
        }
      ];

      const activity = activityTypes[i % activityTypes.length];
      activities.push({
        ...activity,
        timestamp,
        metadata: { seeded: true }
      });
    }

    await ActivityModel.insertMany(activities);
    console.log(`✅ Seeded ${activities.length} activities`);
  } catch (error) {
    console.error('❌ Error seeding activities:', error);
  }
}
