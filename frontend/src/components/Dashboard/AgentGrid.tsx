import type { Agent } from '../../types/api';
import { AgentCard } from './AgentCard';

interface AgentGridProps {
  agents: Agent[];
  onAgentClick: (agent: Agent) => void;
  showMetrics?: boolean;
}

export const AgentGrid = ({ agents, onAgentClick, showMetrics = false }: AgentGridProps) => {
  if (agents.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No hay agentes disponibles</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {agents.map((agent) => (
        <AgentCard
          key={agent.id}
          agent={agent}
          onClick={() => onAgentClick(agent)}
          showMetrics={showMetrics}
        />
      ))}
    </div>
  );
};
