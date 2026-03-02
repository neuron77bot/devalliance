import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAgents } from '../hooks/useAgents';
import type { Agent } from '../types/api';
import { AgentGrid } from '../components/Dashboard/AgentGrid';
import { AgentDetailModal } from '../components/AgentDetail/AgentDetailModal';

export const AgentsPage = () => {
  const { agents, loading, error } = useAgents();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [filter, setFilter] = useState<'all' | 'healthy' | 'warning' | 'offline'>('all');

  const filteredAgents = filter === 'all'
    ? agents
    : agents.filter(agent => agent.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-2">Error al cargar los agentes</p>
          <p className="text-gray-400 text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-100 mb-2">Todos los Agentes</h1>
        <p className="text-gray-400">
          Explora y gestiona el equipo completo de agentes de desarrollo
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        {(['all', 'healthy', 'warning', 'offline'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === f
                ? 'bg-primary-600 text-white'
                : 'bg-navy-800 text-gray-400 hover:bg-navy-700'
            }`}
          >
            {f === 'all' ? 'Todos' : f === 'healthy' ? 'Saludables' : f === 'warning' ? 'Advertencia' : 'Desconectados'}
          </button>
        ))}
      </div>

      {/* Agents Grid */}
      <AgentGrid agents={filteredAgents} onAgentClick={setSelectedAgent} />

      {/* Agent Detail Modal */}
      <AgentDetailModal
        agent={selectedAgent}
        isOpen={selectedAgent !== null}
        onClose={() => setSelectedAgent(null)}
      />
    </div>
  );
};
