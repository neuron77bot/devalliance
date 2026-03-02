import { motion } from 'framer-motion';
import type { Agent } from '../../types/api';
import { formatResponseTime } from '../../utils/helpers';

interface SystemOverviewProps {
  agents: Agent[];
}

export const SystemOverview = ({ agents }: SystemOverviewProps) => {
  const totalAgents = agents.length;
  const activeAgents = agents.filter(a => a.status === 'healthy').length;
  const totalTasks = agents.reduce((sum, a) => sum + a.metrics.tasksCompleted, 0);
  const avgResponseTime = agents.length > 0
    ? agents.reduce((sum, a) => sum + a.metrics.avgResponseTime, 0) / agents.length
    : 0;

  const metrics = [
    {
      label: 'Total Agentes',
      value: totalAgents,
      icon: '🤖',
      color: 'text-blue-400'
    },
    {
      label: 'Agentes Activos',
      value: activeAgents,
      icon: '✅',
      color: 'text-green-400'
    },
    {
      label: 'Tareas Completadas',
      value: totalTasks,
      icon: '✨',
      color: 'text-purple-400'
    },
    {
      label: 'Tiempo Promedio',
      value: formatResponseTime(avgResponseTime),
      icon: '⚡',
      color: 'text-yellow-400'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {metrics.map((metric, index) => (
        <motion.div
          key={metric.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-navy-900 rounded-lg shadow-lg border border-navy-800 p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">{metric.icon}</span>
            <span className={`text-3xl font-bold ${metric.color}`}>
              {metric.value}
            </span>
          </div>
          <p className="text-sm text-gray-400">{metric.label}</p>
        </motion.div>
      ))}
    </div>
  );
};
