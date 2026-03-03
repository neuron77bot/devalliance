import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, Play, Square, RotateCw, AlertCircle, LayoutGrid, List, MessageCircle } from 'lucide-react';
import { useAgents } from '../hooks/useAgents';
import { useAgentActions, type CreateAgentData, type UpdateAgentData } from '../hooks/useAgentActions';
import { CreateEditModal } from '../components/AgentManagement/CreateEditModal';
import { DeleteConfirmModal } from '../components/AgentManagement/DeleteConfirmModal';
import { ChatModal } from '../components/AgentManagement/ChatModal';
import type { Agent } from '../types/api';

type ViewMode = 'grid' | 'list';

export const AgentsPage = () => {
  const { agents, loading, error, refetch } = useAgents();
  const {
    createAgent,
    updateAgent,
    deleteAgent,
    startAgent,
    stopAgent,
    restartAgent
  } = useAgentActions();

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filter, setFilter] = useState<'all' | 'healthy' | 'warning' | 'offline'>('all');
  const [showCreateEditModal, setShowCreateEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [chatAgent, setChatAgent] = useState<Agent | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filter agents
  const filteredAgents = filter === 'all'
    ? agents
    : agents.filter(agent => agent.status === filter);

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Trigger refresh
  const triggerRefresh = async () => {
    await refetch();
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

  // Open chat modal
  const handleOpenChat = (agent: Agent) => {
    setChatAgent(agent);
    setShowChatModal(true);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 flex items-center gap-4">
          <AlertCircle className="text-red-400" size={24} />
          <div>
            <h3 className="text-red-400 font-bold">Error loading agents</h3>
            <p className="text-red-300 text-sm mt-1">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Agents</h1>
          <p className="text-gray-400">Manage and monitor all AI agents</p>
        </div>
        
        <div className="flex gap-3">
          {/* View Mode Toggle */}
          <div className="bg-navy-800 border border-navy-700 rounded-lg p-1 flex gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 rounded-md transition-all flex items-center gap-2 ${
                viewMode === 'grid'
                  ? 'bg-cyan-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-navy-700'
              }`}
              title="Grid View"
            >
              <LayoutGrid size={16} />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 rounded-md transition-all flex items-center gap-2 ${
                viewMode === 'list'
                  ? 'bg-cyan-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-navy-700'
              }`}
              title="List View"
            >
              <List size={16} />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>

          <button
            onClick={openCreateModal}
            className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            <span className="hidden md:inline">Create Agent</span>
          </button>
        </div>
      </div>

      {/* Toast notification */}
      <AnimatePresence>
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
      </AnimatePresence>

      {/* Filters */}
      <div className="flex gap-3">
        {(['all', 'healthy', 'warning', 'offline'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === f
                ? 'bg-cyan-500 text-white'
                : 'bg-navy-800 text-gray-400 hover:bg-navy-700 border border-navy-700'
            }`}
          >
            {f === 'all' ? 'All' : f === 'healthy' ? 'Healthy' : f === 'warning' ? 'Warning' : 'Offline'}
          </button>
        ))}
        <div className="flex-1"></div>
        <div className="text-sm text-gray-400 flex items-center">
          Total: <span className="ml-2 font-semibold text-white">{filteredAgents.length}</span>
        </div>
      </div>

      {/* Agent grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map((agent, index) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-navy-800 rounded-lg border border-navy-700 hover:border-cyan-500/40 p-6 transition-all"
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
              <div className="flex gap-2 pt-4 border-t border-navy-700">
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

                {/* Chat button */}
                <button
                  onClick={() => handleOpenChat(agent)}
                  className="p-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded transition-colors"
                  title="Chat"
                >
                  <MessageCircle size={18} />
                </button>

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
      ) : (
        /* List View */
        <div className="bg-navy-900 border border-navy-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-navy-700 bg-navy-800/50">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400 uppercase">Name</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400 uppercase hidden md:table-cell">Role</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400 uppercase">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400 uppercase hidden lg:table-cell">Description</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-700">
                {filteredAgents.map((agent, index) => (
                  <motion.tr
                    key={agent.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-navy-800/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{agent.name}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm hidden md:table-cell">{agent.role}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(agent.status)}`}>
                        {agent.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm hidden lg:table-cell">
                      <p className="line-clamp-2 max-w-md">{agent.description}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleStartAgent(agent)}
                          className="p-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded transition-colors"
                          title="Start"
                        >
                          <Play size={16} />
                        </button>
                        <button
                          onClick={() => handleStopAgent(agent)}
                          className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded transition-colors"
                          title="Stop"
                        >
                          <Square size={16} />
                        </button>
                        <button
                          onClick={() => handleRestartAgent(agent)}
                          className="p-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded transition-colors"
                          title="Restart"
                        >
                          <RotateCw size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenChat(agent)}
                          className="p-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded transition-colors"
                          title="Chat"
                        >
                          <MessageCircle size={16} />
                        </button>
                        <button
                          onClick={() => openEditModal(agent)}
                          className="p-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => openDeleteModal(agent)}
                          className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {filteredAgents.length === 0 && (
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

      {/* Chat Modal */}
      {showChatModal && chatAgent && (
        <ChatModal
          agent={chatAgent}
          onClose={() => {
            setShowChatModal(false);
            setChatAgent(null);
          }}
        />
      )}
    </div>
  );
};
