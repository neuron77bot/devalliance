import React, { useState } from 'react';
import { Modal } from '../UI/Modal';
import { AgentOutputConsole } from '../AgentOutput/AgentOutputConsole';
import { useTaskExecution } from '../../hooks/useTaskExecution';
import { Task } from '../../types/task';

interface TaskExecutionModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
}

export function TaskExecutionModal({ task, isOpen, onClose }: TaskExecutionModalProps) {
  const {
    status,
    progress,
    output,
    isExecuting,
    error,
    startExecution,
    cancelExecution
  } = useTaskExecution(task._id);

  const [executing, setExecuting] = useState(false);

  const handleStartExecution = async () => {
    try {
      setExecuting(true);
      await startExecution();
    } catch (err) {
      console.error('Failed to start execution:', err);
    } finally {
      setExecuting(false);
    }
  };

  const handleCancelExecution = async () => {
    try {
      await cancelExecution();
    } catch (err) {
      console.error('Failed to cancel execution:', err);
    }
  };

  // Get status badge color
  const getStatusColor = (s: string) => {
    switch (s) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'in_progress': return 'bg-blue-500';
      case 'cancelled': return 'bg-gray-500';
      default: return 'bg-yellow-500';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Task Execution">
      <div className="space-y-4">
        {/* Task Info */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-2">{task.title}</h3>
          <p className="text-sm text-gray-400 mb-3">{task.description}</p>
          
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Status:</span>
              <span className={`px-2 py-1 rounded text-white text-xs font-medium ${getStatusColor(status || task.status)}`}>
                {status || task.status}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Priority:</span>
              <span className={`px-2 py-1 rounded text-white text-xs font-medium ${
                task.priority === 'critical' ? 'bg-red-500' :
                task.priority === 'high' ? 'bg-orange-500' :
                task.priority === 'medium' ? 'bg-yellow-500' :
                'bg-green-500'
              }`}>
                {task.priority}
              </span>
            </div>

            {task.assignedTo && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Agent:</span>
                <span className="text-white text-xs font-medium">{task.assignedTo}</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {isExecuting && progress > 0 && (
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">Progress</span>
              <span className="text-sm text-gray-400">{progress}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <span className="text-red-500 text-xl">❌</span>
              <div>
                <h4 className="text-red-500 font-semibold mb-1">Execution Error</h4>
                <p className="text-sm text-red-300">{error.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Output Console */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2">Agent Output</h4>
          <AgentOutputConsole
            outputs={output}
            maxHeight="300px"
            autoScroll={true}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-700">
          <div className="flex gap-2">
            {!isExecuting && status !== 'completed' && status !== 'failed' && (
              <button
                onClick={handleStartExecution}
                disabled={executing || !task.assignedTo}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <span>🚀</span>
                {executing ? 'Starting...' : 'Start Execution'}
              </button>
            )}

            {isExecuting && (
              <button
                onClick={handleCancelExecution}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <span>🛑</span>
                Cancel Execution
              </button>
            )}

            {status === 'completed' && (
              <div className="flex items-center gap-2 text-green-500">
                <span className="text-2xl">✅</span>
                <span className="font-medium">Task Completed</span>
              </div>
            )}

            {status === 'failed' && (
              <div className="flex items-center gap-2 text-red-500">
                <span className="text-2xl">❌</span>
                <span className="font-medium">Task Failed</span>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
