import mongoose from 'mongoose';
import { TaskModel } from '../src/models/Task.model';
import { AgentModel } from '../src/models/Agent.model';
import { InteractionModel } from '../src/models/Interaction.model';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/devalliance';

const sampleTasks = [
  {
    title: 'Implement User Authentication',
    description: 'Create JWT-based authentication system with login, logout, and token refresh functionality.',
    status: 'in_progress',
    priority: 'urgent',
    estimatedDuration: 120,
    tags: ['backend', 'security', 'auth']
  },
  {
    title: 'Design Database Schema',
    description: 'Create MongoDB schema for users, tasks, and projects with proper relationships and indexes.',
    status: 'completed',
    priority: 'high',
    estimatedDuration: 90,
    actualDuration: 85,
    tags: ['database', 'design']
  },
  {
    title: 'Setup CI/CD Pipeline',
    description: 'Configure GitHub Actions for automated testing and deployment to production.',
    status: 'pending',
    priority: 'high',
    estimatedDuration: 180,
    tags: ['devops', 'ci-cd', 'automation']
  },
  {
    title: 'Create API Documentation',
    description: 'Write comprehensive API documentation using Swagger/OpenAPI specification.',
    status: 'assigned',
    priority: 'medium',
    estimatedDuration: 60,
    tags: ['documentation', 'api']
  },
  {
    title: 'Optimize Database Queries',
    description: 'Profile and optimize slow database queries, add appropriate indexes.',
    status: 'paused',
    priority: 'medium',
    estimatedDuration: 45,
    tags: ['performance', 'database']
  },
  {
    title: 'Implement Real-time Notifications',
    description: 'Add WebSocket support for real-time push notifications to users.',
    status: 'in_progress',
    priority: 'high',
    estimatedDuration: 150,
    tags: ['realtime', 'websocket', 'backend']
  },
  {
    title: 'Fix Critical Security Vulnerability',
    description: 'Patch SQL injection vulnerability in search endpoint reported by security audit.',
    status: 'failed',
    priority: 'urgent',
    estimatedDuration: 30,
    actualDuration: 45,
    tags: ['security', 'bugfix', 'critical']
  },
  {
    title: 'Update Dependencies',
    description: 'Update all npm packages to latest stable versions and test for compatibility.',
    status: 'cancelled',
    priority: 'low',
    estimatedDuration: 60,
    tags: ['maintenance', 'dependencies']
  },
  {
    title: 'Create Admin Dashboard',
    description: 'Build admin interface for user management and system monitoring.',
    status: 'pending',
    priority: 'medium',
    estimatedDuration: 240,
    tags: ['frontend', 'admin', 'dashboard']
  },
  {
    title: 'Write Unit Tests',
    description: 'Achieve 80% code coverage with comprehensive unit tests for core modules.',
    status: 'assigned',
    priority: 'medium',
    estimatedDuration: 120,
    tags: ['testing', 'quality']
  }
];

async function seedTasks() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get existing agents
    const agents = await AgentModel.find();
    if (agents.length === 0) {
      console.error('❌ No agents found. Please seed agents first.');
      process.exit(1);
    }

    console.log(`📋 Found ${agents.length} agents`);

    // Clear existing tasks and interactions
    await TaskModel.deleteMany({});
    await InteractionModel.deleteMany({});
    console.log('🗑️  Cleared existing tasks and interactions');

    // Create tasks
    const createdTasks = [];
    for (let i = 0; i < sampleTasks.length; i++) {
      const taskData = sampleTasks[i];
      
      // Assign to agents for certain statuses
      let assignedTo;
      if (['assigned', 'in_progress', 'paused', 'completed', 'failed'].includes(taskData.status)) {
        assignedTo = agents[i % agents.length].id;
      }

      // Set timestamps based on status
      const createdAt = new Date(Date.now() - (10 - i) * 24 * 60 * 60 * 1000); // Stagger over 10 days
      let startedAt;
      let completedAt;

      if (['in_progress', 'paused', 'completed', 'failed'].includes(taskData.status)) {
        startedAt = new Date(createdAt.getTime() + 60 * 60 * 1000); // 1 hour after creation
      }

      if (['completed', 'failed'].includes(taskData.status)) {
        completedAt = new Date(startedAt!.getTime() + (taskData.actualDuration || taskData.estimatedDuration) * 60 * 1000);
      }

      const task = new TaskModel({
        ...taskData,
        assignedTo,
        createdAt,
        startedAt,
        completedAt,
        createdBy: 'system',
        dependencies: [],
        metadata: {}
      });

      const savedTask = await task.save();
      createdTasks.push(savedTask);

      // Create some interactions
      if (assignedTo) {
        await InteractionModel.create({
          taskId: savedTask._id.toString(),
          type: 'assignment',
          toAgent: assignedTo,
          message: `Task assigned to ${assignedTo}`,
          timestamp: createdAt
        });
      }

      if (startedAt) {
        await InteractionModel.create({
          taskId: savedTask._id.toString(),
          type: 'status_change',
          fromAgent: assignedTo,
          message: `Status changed from assigned to in_progress`,
          timestamp: startedAt,
          metadata: { fromStatus: 'assigned', toStatus: 'in_progress' }
        });
      }

      // Add some comments to in_progress tasks
      if (taskData.status === 'in_progress' && Math.random() > 0.5) {
        await InteractionModel.create({
          taskId: savedTask._id.toString(),
          type: 'comment',
          fromAgent: assignedTo,
          message: 'Working on this, making good progress!',
          timestamp: new Date(startedAt!.getTime() + 30 * 60 * 1000)
        });
      }
    }

    console.log(`✅ Created ${createdTasks.length} tasks`);
    console.log('\n📊 Task Summary:');
    console.log(`   - Pending: ${createdTasks.filter(t => t.status === 'pending').length}`);
    console.log(`   - Assigned: ${createdTasks.filter(t => t.status === 'assigned').length}`);
    console.log(`   - In Progress: ${createdTasks.filter(t => t.status === 'in_progress').length}`);
    console.log(`   - Paused: ${createdTasks.filter(t => t.status === 'paused').length}`);
    console.log(`   - Completed: ${createdTasks.filter(t => t.status === 'completed').length}`);
    console.log(`   - Failed: ${createdTasks.filter(t => t.status === 'failed').length}`);
    console.log(`   - Cancelled: ${createdTasks.filter(t => t.status === 'cancelled').length}`);

    console.log('\n✨ Task seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding tasks:', error);
    process.exit(1);
  }
}

seedTasks();
