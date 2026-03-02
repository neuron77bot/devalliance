import { motion } from 'framer-motion';
import type { Agent } from '../../types/api';
import { StatusBadge } from './StatusBadge';
import { AgentMetrics } from './AgentMetrics';
import { formatUptime, formatResponseTime } from '../../utils/helpers';
import { useSingleAgentMetrics } from '../../hooks/useMetrics';

interface AgentCardProps {
  agent: Agent;
  onClick?: () => void;
  showMetrics?: boolean;
}

export const AgentCard = ({ agent, onClick, showMetrics = false }: AgentCardProps) => {
  const { metrics: agentMetrics, loading: metricsLoading } = useSingleAgentMetrics(
    showMetrics ? agent.id : null
  );
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, borderColor: 'rgba(99, 102, 241, 0.5)' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-navy-900 rounded-lg shadow-lg border border-navy-800 p-6 cursor-pointer transition-all duration-200"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-100 mb-1">{agent.name}</h3>
          <p className="text-sm text-primary-400 font-medium">{agent.role}</p>
        </div>
        <StatusBadge status={agent.status} showText={false} />
      </div>

      {/* Description */}
      <p className="text-gray-400 text-sm mb-4 line-clamp-2">
        {agent.description}
      </p>

      {/* Capabilities */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Capacidades</h4>
        <div className="flex flex-wrap gap-2">
          {agent.capabilities.slice(0, 3).map((capability, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-navy-800 text-gray-300 text-xs rounded-md border border-navy-700"
            >
              {capability}
            </span>
          ))}
          {agent.capabilities.length > 3 && (
            <span className="px-2 py-1 text-gray-500 text-xs">
              +{agent.capabilities.length - 3} más
            </span>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-navy-800">
        <div>
          <p className="text-xs text-gray-500 mb-1">Uptime</p>
          <p className="text-sm font-semibold text-gray-200">
            {formatUptime(agent.metrics?.uptime || 0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Tareas</p>
          <p className="text-sm font-semibold text-gray-200">
            {agent.metrics?.tasksCompleted || 0}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Respuesta</p>
          <p className="text-sm font-semibold text-gray-200">
            {formatResponseTime(agent.metrics?.avgResponseTime || 0)}
          </p>
        </div>
      </div>

      {/* Extended Metrics (expandible) */}
      {showMetrics && (
        <AgentMetrics metrics={agentMetrics} loading={metricsLoading} />
      )}
    </motion.div>
  );
};
