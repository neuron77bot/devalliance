import { motion } from 'framer-motion';
import { Clock, User, Tag, AlertCircle } from 'lucide-react';
import { useTaskWorkflow } from '../../hooks/useTaskWorkflow';
import type { Task } from '../../types/task';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  isDragging?: boolean;
}

export function TaskCard({ task, onClick, isDragging }: TaskCardProps) {
  const { getPriorityColor, getPriorityLabel } = useTaskWorkflow();

  const priorityColor = getPriorityColor(task.priority);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={`
        bg-navy-800 border border-navy-700 rounded-lg p-4 cursor-pointer
        hover:border-cyan-500/50 transition-all duration-200
        ${isDragging ? 'opacity-50' : ''}
      `}
    >
      {/* Header: Priority and Tags */}
      <div className="flex items-start justify-between mb-2">
        <span className={`text-xs font-semibold uppercase ${priorityColor}`}>
          {getPriorityLabel(task.priority)}
        </span>
        {task.tags && task.tags.length > 0 && (
          <div className="flex gap-1">
            {task.tags.slice(0, 2).map((tag, i) => (
              <span
                key={i}
                className="flex items-center gap-1 text-xs bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded"
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

      {/* Title */}
      <h3 className="text-white font-semibold mb-2 line-clamp-2">
        {task.title}
      </h3>

      {/* Description */}
      <p className="text-gray-400 text-sm mb-3 line-clamp-2">
        {task.description}
      </p>

      {/* Footer: Metadata */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-3">
          {task.assignedTo && (
            <div className="flex items-center gap-1">
              <User size={12} />
              <span>{task.assignedTo.slice(0, 8)}</span>
            </div>
          )}
          
          {task.estimatedDuration && (
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span>{task.estimatedDuration}m</span>
            </div>
          )}
        </div>

        {/* Dependencies indicator */}
        {task.dependencies && task.dependencies.length > 0 && (
          <div className="flex items-center gap-1 text-orange-400">
            <AlertCircle size={12} />
            <span>{task.dependencies.length}</span>
          </div>
        )}
      </div>

      {/* Progress indicator for in_progress tasks */}
      {task.status === 'in_progress' && task.startedAt && task.estimatedDuration && (
        <div className="mt-2">
          <div className="w-full bg-navy-700 rounded-full h-1">
            <div
              className="bg-cyan-500 h-1 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(
                  ((Date.now() - new Date(task.startedAt).getTime()) / (task.estimatedDuration * 60000)) * 100,
                  100
                )}%`
              }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
