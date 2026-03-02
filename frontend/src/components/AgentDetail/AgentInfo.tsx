import type { Agent } from '../../types/api';
import { StatusBadge } from '../Dashboard/StatusBadge';
import { formatUptime, formatResponseTime } from '../../utils/helpers';

interface AgentInfoProps {
  agent: Agent;
}

export const AgentInfo = ({ agent }: AgentInfoProps) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-100 mb-1">{agent.name}</h2>
            <p className="text-lg text-primary-400 font-medium">{agent.role}</p>
          </div>
          <StatusBadge status={agent.status} />
        </div>
        <p className="text-gray-300">{agent.description}</p>
      </div>

      {/* Capabilities */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Capacidades</h3>
        <div className="flex flex-wrap gap-2">
          {agent.capabilities.map((capability, index) => (
            <span
              key={index}
              className="px-3 py-2 bg-navy-800 text-gray-300 text-sm rounded-md border border-navy-700"
            >
              {capability}
            </span>
          ))}
        </div>
      </div>

      {/* Metrics */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Métricas</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-navy-800 rounded-lg p-4 border border-navy-700">
            <p className="text-xs text-gray-500 mb-1">Uptime</p>
            <p className="text-xl font-bold text-gray-200">
              {formatUptime(agent.metrics.uptime)}
            </p>
          </div>
          <div className="bg-navy-800 rounded-lg p-4 border border-navy-700">
            <p className="text-xs text-gray-500 mb-1">Tareas Completadas</p>
            <p className="text-xl font-bold text-gray-200">
              {agent.metrics.tasksCompleted}
            </p>
          </div>
          <div className="bg-navy-800 rounded-lg p-4 border border-navy-700">
            <p className="text-xs text-gray-500 mb-1">Tiempo de Respuesta</p>
            <p className="text-xl font-bold text-gray-200">
              {formatResponseTime(agent.metrics.avgResponseTime)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
