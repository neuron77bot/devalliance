import { motion } from 'framer-motion';
import { Eye, Clock, User, Tag } from 'lucide-react';
import type { Task } from '../../types/task';

interface TaskTableViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export function TaskTableView({ tasks, onTaskClick }: TaskTableViewProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'assigned': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'in_progress': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'paused': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'failed': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'cancelled': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-orange-400';
      case 'urgent': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-navy-900 border border-navy-700 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-navy-700 bg-navy-800/50">
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Title
              </th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                Description
              </th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">
                Priority
              </th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">
                Assigned To
              </th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400 uppercase tracking-wider hidden xl:table-cell">
                Created
              </th>
              <th className="text-right px-6 py-4 text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-700">
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No tasks found
                </td>
              </tr>
            ) : (
              tasks.map((task, index) => (
                <motion.tr
                  key={task._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-navy-800/50 transition-colors cursor-pointer"
                  onClick={() => onTaskClick(task)}
                >
                  {/* Title */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-white font-medium line-clamp-1">
                        {task.title}
                      </span>
                      {task.tags && task.tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {task.tags.slice(0, 2).map((tag, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 text-xs bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded"
                            >
                              <Tag size={10} />
                              {tag}
                            </span>
                          ))}
                          {task.tags.length > 2 && (
                            <span className="text-xs text-gray-400">+{task.tags.length - 2}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Description */}
                  <td className="px-6 py-4 hidden lg:table-cell">
                    <p className="text-gray-400 text-sm line-clamp-2 max-w-md">
                      {task.description}
                    </p>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(task.status)}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </td>

                  {/* Priority */}
                  <td className="px-6 py-4 hidden md:table-cell">
                    <span className={`text-sm font-semibold uppercase ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </td>

                  {/* Assigned To */}
                  <td className="px-6 py-4 hidden md:table-cell">
                    {task.assignedTo ? (
                      <div className="flex items-center gap-2 text-sm">
                        <User size={14} className="text-gray-400" />
                        <span className="text-cyan-400">{task.assignedTo}</span>
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">Unassigned</span>
                    )}
                  </td>

                  {/* Created */}
                  <td className="px-6 py-4 hidden xl:table-cell">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Clock size={14} />
                      <span>{formatDate(task.createdAt)}</span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTaskClick(task);
                      }}
                      className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      <Eye size={16} />
                      <span className="hidden sm:inline text-sm">View</span>
                    </button>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
