import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Play, Square, RotateCw, AlertCircle } from 'lucide-react';
import { useAgents } from '../hooks/useAgents';
import { useAgentActions, type CreateAgentData, type UpdateAgentData } from '../hooks/useAgentActions';
import { CreateEditModal } from '../components/AgentManagement/CreateEditModal';
import { DeleteConfirmModal } from '../components/AgentManagement/DeleteConfirmModal';
import type { Agent } from '../types/api';

export const AgentManagement: React.FC = () => {
  const { agents, loading, error } = useAgents();
  const {
    createAgent,
    updateAgent,
    deleteAgent,
    startAgent,
    stopAgent,
    restartAgent
  } = useAgentActions();

  const [showCreateEditModal, setShowCreateEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Trigger refresh
  const triggerRefresh = () => {
    // Reload page to refresh agent list
    window.location.reload();
  };

  // Handle create agent
  const handleCreateAgent = async (data: CreateAgentData) => {
    try {
      await createAgent(data);
      showToast(`Agent "${data.name}" created successfully!`, 'success');
      setShowCreateEditModal(false);
      triggerRefresh();
    } catch (error) {
      showToast(`Failed to create agent: ${(error as Error).message}`, 'error');
      throw error;
    }
  };

  // Handle update agent
  const handleUpdateAgent = async (data: UpdateAgentData) => {
    if (!selectedAgent) return;
    
    try {
      await updateAgent(selectedAgent.id, data);
      showToast(`Agent "${selectedAgent.name}" updated successfully!`, 'success');
      setShowCreateEditModal(false);
      setSelectedAgent(null);
      triggerRefresh();
    } catch (error) {
      showToast(`Failed to update agent: ${(error as Error).message}`, 'error');
      throw error;
    }
  };

  // Handle delete agent
  const handleDeleteAgent = async () => {
    if (!selectedAgent) return;

    try {
      await deleteAgent(selectedAgent.id);
      showToast(`Agent "${selectedAgent.name}" deleted successfully!`, 'success');
      setShowDeleteModal(false);
      setSelectedAgent(null);
      triggerRefresh();
    } catch (error) {
      showToast(`Failed to delete agent: ${(error as Error).message}`, 'error');
      throw error;
    }
  };

  // Handle start agent
  const handleStartAgent = async (agent: Agent) => {
    try {
      await startAgent(agent.id);
      showToast(`Agent "${agent.name}" started!`, 'success');
      triggerRefresh();
    } catch (error) {
      showToast(`Failed to start agent: ${(error as Error).message}`, 'error');
    }
  };

  // Handle stop agent
  const handleStopAgent = async (agent: Agent) => {
    try {
      await stopAgent(agent.id);
      showToast(`Agent "${agent.name}" stopped!`, 'success');
      triggerRefresh();
    } catch (error) {
      showToast(`Failed to stop agent: ${(error as Error).message}`, 'error');
    }
  };

  // Handle restart agent
  const handleRestartAgent = async (agent: Agent) => {
    try {
      await restartAgent(agent.id);
      showToast(`Agent "${agent.name}" restarted!`, 'success');
      triggerRefresh();
    } catch (error) {
      showToast(`Failed to restart agent: ${(error as Error).message}`, 'error');
    }
  };

  // Open edit modal
  const openEditModal = (agent: Agent) => {
    setSelectedAgent(agent);
    setModalMode('edit');
    setShowCreateEditModal(true);
  };

  // Open delete modal
  const openDeleteModal = (agent: Agent) => {
    setSelectedAgent(agent);
    setShowDeleteModal(true);
  };

  // Open create modal
  const openCreateModal = () => {
    setSelectedAgent(null);
    setModalMode('create');
    setShowCreateEditModal(true);
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500/20 text-green-400 border-green-500/40';
      case 'warning':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
      case 'error':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/40';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-cyan-400">Agent Management</h1>
          <p className="text-gray-400 mt-2">Create, edit, and manage your AI agents</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
        >
          <Plus size={20} />
          Create New Agent
        </button>
      </div>

      {/* Toast notification */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </motion.div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 flex items-center gap-4">
          <AlertCircle className="text-red-400" size={24} />
          <div>
            <h3 className="text-red-400 font-bold">Error loading agents</h3>
            <p className="text-red-300 text-sm mt-1">{error.message}</p>
          </div>
        </div>
      )}

      {/* Agent grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-navy-800 rounded-lg border border-cyan-500/20 p-6 hover:border-cyan-500/40 transition-all"
            >
              {/* Agent header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{agent.name}</h3>
                  <p className="text-gray-400 text-sm mt-1">{agent.role}</p>
                </div>
                <div className={`px-3 py-1 rounded-full border text-xs font-medium ${getStatusColor(agent.status)}`}>
                  {agent.status}
                </div>
              </div>

              {/* Description */}
              <p className="text-gray-300 text-sm mb-4 line-clamp-2">{agent.description}</p>

              {/* Capabilities */}
              {agent.capabilities && agent.capabilities.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-400 mb-2">Capabilities:</p>
                  <div className="flex flex-wrap gap-2">
                    {agent.capabilities.slice(0, 3).map((cap) => (
                      <span
                        key={cap}
                        className="px-2 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded text-cyan-300 text-xs"
                      >
                        {cap}
                      </span>
                    ))}
                    {agent.capabilities.length > 3 && (
                      <span className="px-2 py-1 text-gray-400 text-xs">
                        +{agent.capabilities.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-cyan-500/20">
                {/* Control buttons */}
                <button
                  onClick={() => handleStartAgent(agent)}
                  className="p-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded transition-colors"
                  title="Start"
                >
                  <Play size={18} />
                </button>
                <button
                  onClick={() => handleStopAgent(agent)}
                  className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded transition-colors"
                  title="Stop"
                >
                  <Square size={18} />
                </button>
                <button
                  onClick={() => handleRestartAgent(agent)}
                  className="p-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded transition-colors"
                  title="Restart"
                >
                  <RotateCw size={18} />
                </button>

                <div className="flex-1"></div>

                {/* Edit and Delete buttons */}
                <button
                  onClick={() => openEditModal(agent)}
                  className="p-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 rounded transition-colors"
                  title="Edit"
                >
                  <Edit size={18} />
                </button>
                <button
                  onClick={() => openDeleteModal(agent)}
                  className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded transition-colors"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && agents.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">No agents found. Create your first agent to get started!</p>
        </div>
      )}

      {/* Modals */}
      <CreateEditModal
        isOpen={showCreateEditModal}
        onClose={() => {
          setShowCreateEditModal(false);
          setSelectedAgent(null);
        }}
        onSave={modalMode === 'create' ? handleCreateAgent : handleUpdateAgent}
        agent={selectedAgent}
        mode={modalMode}
      />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedAgent(null);
        }}
        onConfirm={handleDeleteAgent}
        agent={selectedAgent}
      />
    </div>
  );
};
