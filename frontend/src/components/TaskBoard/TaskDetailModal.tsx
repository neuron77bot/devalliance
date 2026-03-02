import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Clock, User, Tag, Calendar, ArrowRightLeft, Trash2 } from 'lucide-react';
import { useTaskActions } from '../../hooks/useTasks';
import { useTaskWorkflow } from '../../hooks/useTaskWorkflow';
import { useAgents } from '../../hooks/useAgents';
import { InteractionThread } from './InteractionThread';
import type { Task, TaskStatus, HandoffRequest } from '../../types/task';

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
  onUpdate: () => void;
}

export function TaskDetailModal({ task, onClose, onUpdate }: TaskDetailModalProps) {
  const { changeStatus, assignTask, handoffTask, deleteTask, submitting } = useTaskActions();
  const { agents } = useAgents();
  const { 
    getStatusLabel, 
    getStatusColor, 
    getPriorityColor, 
    getPriorityLabel, 
    availableActions 
  } = useTaskWorkflow(task.status);

  const [showHandoffForm, setShowHandoffForm] = useState(false);
  const [handoffData, setHandoffData] = useState<HandoffRequest>({ toAgent: '', message: '' });

  const handleStatusChange = async (newStatus: TaskStatus) => {
    try {
      await changeStatus(task._id, { status: newStatus });
      onUpdate();
    } catch (err) {
      console.error('Error changing status:', err);
    }
  };

  const handleAssign = async (agentId: string) => {
    try {
      await assignTask(task._id, agentId);
      onUpdate();
    } catch (err) {
      console.error('Error assigning task:', err);
    }
  };

  const handleHandoff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handoffData.toAgent) return;

    try {
      await handoffTask(task._id, handoffData);
      setShowHandoffForm(false);
      setHandoffData({ toAgent: '', message: '' });
      onUpdate();
    } catch (err) {
      console.error('Error creating handoff:', err);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await deleteTask(task._id);
      onClose();
      onUpdate();
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-navy-900 border border-navy-700 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(task.status)} text-white`}>
                {getStatusLabel(task.status)}
              </span>
              <span className={`text-sm font-semibold ${getPriorityColor(task.priority)}`}>
                {getPriorityLabel(task.priority)} Priority
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{task.title}</h2>
            <p className="text-gray-400">{task.description}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Details */}
          <div className="space-y-6">
            {/* Metadata */}
            <div className="bg-navy-800/50 border border-navy-700 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-white mb-3">Details</h3>

              <div className="flex items-center gap-2 text-sm">
                <Calendar size={16} className="text-gray-400" />
                <span className="text-gray-400">Created:</span>
                <span className="text-white">{formatDate(task.createdAt)}</span>
              </div>

              {task.startedAt && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock size={16} className="text-gray-400" />
                  <span className="text-gray-400">Started:</span>
                  <span className="text-white">{formatDate(task.startedAt)}</span>
                </div>
              )}

              {task.completedAt && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock size={16} className="text-gray-400" />
                  <span className="text-gray-400">Completed:</span>
                  <span className="text-white">{formatDate(task.completedAt)}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <Clock size={16} className="text-gray-400" />
                <span className="text-gray-400">Estimated:</span>
                <span className="text-white">{formatDuration(task.estimatedDuration)}</span>
              </div>

              {task.actualDuration && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock size={16} className="text-gray-400" />
                  <span className="text-gray-400">Actual:</span>
                  <span className="text-white">{formatDuration(task.actualDuration)}</span>
                </div>
              )}

              {task.assignedTo && (
                <div className="flex items-center gap-2 text-sm">
                  <User size={16} className="text-gray-400" />
                  <span className="text-gray-400">Assigned to:</span>
                  <span className="text-cyan-400">{task.assignedTo}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <div className="bg-navy-800/50 border border-navy-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Tag size={18} />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {task.tags.map(tag => (
                    <span
                      key={tag}
                      className="bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="bg-navy-800/50 border border-navy-700 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-white mb-3">Actions</h3>

              {/* Status Change */}
              {availableActions.length > 0 && (
                <div>
                  <p className="text-sm text-gray-400 mb-2">Change Status:</p>
                  <div className="flex flex-wrap gap-2">
                    {availableActions.map(action => (
                      <button
                        key={action.to}
                        onClick={() => handleStatusChange(action.to)}
                        disabled={submitting}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors
                          ${submitting ? 'opacity-50 cursor-not-allowed' : ''}
                          bg-${action.color}-500/20 text-${action.color}-400 
                          hover:bg-${action.color}-500/30 border border-${action.color}-500/30`}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Assign */}
              <div>
                <p className="text-sm text-gray-400 mb-2">Assign to Agent:</p>
                <select
                  onChange={(e) => e.target.value && handleAssign(e.target.value)}
                  disabled={submitting}
                  className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                  defaultValue=""
                >
                  <option value="">Select agent...</option>
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} - {agent.role}
                    </option>
                  ))}
                </select>
              </div>

              {/* Handoff */}
              <div>
                {!showHandoffForm ? (
                  <button
                    onClick={() => setShowHandoffForm(true)}
                    className="w-full bg-yellow-500/20 text-yellow-400 px-4 py-2 rounded-lg hover:bg-yellow-500/30 transition-colors flex items-center justify-center gap-2"
                  >
                    <ArrowRightLeft size={16} />
                    Request Handoff
                  </button>
                ) : (
                  <form onSubmit={handleHandoff} className="space-y-2">
                    <select
                      value={handoffData.toAgent}
                      onChange={(e) => setHandoffData(prev => ({ ...prev, toAgent: e.target.value }))}
                      required
                      className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                    >
                      <option value="">Select agent...</option>
                      {agents.map(agent => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name} - {agent.role}
                        </option>
                      ))}
                    </select>
                    <textarea
                      value={handoffData.message}
                      onChange={(e) => setHandoffData(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Handoff message (optional)"
                      className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={submitting || !handoffData.toAgent}
                        className="flex-1 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        Send Handoff
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowHandoffForm(false);
                          setHandoffData({ toAgent: '', message: '' });
                        }}
                        className="px-3 py-1 text-gray-400 hover:text-white transition-colors text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Delete */}
              <button
                onClick={handleDelete}
                disabled={submitting}
                className="w-full bg-red-500/20 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
                Delete Task
              </button>
            </div>
          </div>

          {/* Right Column: Interactions */}
          <div className="bg-navy-800/50 border border-navy-700 rounded-lg p-4">
            <InteractionThread taskId={task._id} />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
