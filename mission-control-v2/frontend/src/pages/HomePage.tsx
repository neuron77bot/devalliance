import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAgents } from '../hooks/useAgents';
import type { Agent } from '../types/api';
import { SystemOverview } from '../components/Dashboard/SystemOverview';
import { AgentGrid } from '../components/Dashboard/AgentGrid';
import { AgentDetailModal } from '../components/AgentDetail/AgentDetailModal';

export const HomePage = () => {
  const { agents, loading, error } = useAgents();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

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
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-gray-100 mb-2">
          Mission Control Dashboard
        </h1>
        <p className="text-gray-400">
          Monitorea y gestiona todos tus agentes de desarrollo
        </p>
      </motion.div>

      {/* System Overview */}
      <SystemOverview agents={agents} />

      {/* Agents Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-2xl font-bold text-gray-100 mb-6">Agentes</h2>
        <AgentGrid agents={agents} onAgentClick={setSelectedAgent} />
      </motion.div>

      {/* Agent Detail Modal */}
      <AgentDetailModal
        agent={selectedAgent}
        isOpen={selectedAgent !== null}
        onClose={() => setSelectedAgent(null)}
      />
    </div>
  );
};
