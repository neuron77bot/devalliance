import { motion } from 'framer-motion';
import {
  Play,
  Square,
  CheckCircle,
  AlertCircle,
  XCircle,
  Info
} from 'lucide-react';
import type { Activity, ActivityType, ActivityLevel } from '../../hooks/useActivity';

interface ActivityTimelineProps {
  activities: Activity[];
  loading?: boolean;
  maxHeight?: string;
}

// Iconos por tipo de actividad
const activityIcons: Record<ActivityType, React.ReactNode> = {
  agent_started: <Play className="w-4 h-4" />,
  agent_stopped: <Square className="w-4 h-4" />,
  agent_error: <XCircle className="w-4 h-4" />,
  task_created: <Info className="w-4 h-4" />,
  task_started: <Play className="w-4 h-4" />,
  task_completed: <CheckCircle className="w-4 h-4" />,
  task_failed: <AlertCircle className="w-4 h-4" />,
  system_event: <Info className="w-4 h-4" />
};

// Colores por nivel
const levelColors: Record<ActivityLevel, { bg: string; icon: string; border: string }> = {
  success: {
    bg: 'bg-green-500/10',
    icon: 'text-green-400',
    border: 'border-green-500/30'
  },
  info: {
    bg: 'bg-blue-500/10',
    icon: 'text-blue-400',
    border: 'border-blue-500/30'
  },
  warning: {
    bg: 'bg-yellow-500/10',
    icon: 'text-yellow-400',
    border: 'border-yellow-500/30'
  },
  error: {
    bg: 'bg-red-500/10',
    icon: 'text-red-400',
    border: 'border-red-500/30'
  }
};

// Formato de tiempo relativo
function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const date = new Date(timestamp);
  const diff = now - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Justo ahora';
  if (minutes < 60) return `Hace ${minutes} min`;
  if (hours < 24) return `Hace ${hours}h`;
  return `Hace ${days}d`;
}

export const ActivityTimeline = ({
  activities,
  loading = false,
  maxHeight = '600px'
}: ActivityTimelineProps) => {
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-100 mb-4">
          Activity Timeline
        </h3>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="w-8 h-8 bg-gray-700/50 rounded-full animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-700/50 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-gray-700/50 rounded animate-pulse w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6 hover:border-gray-600/50 transition-colors"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-100">Activity Timeline</h3>
        <span className="text-xs text-gray-400">
          {activities.length} eventos
        </span>
      </div>

      <div
        className="overflow-y-auto pr-2 space-y-4"
        style={{ maxHeight }}
      >
        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Info className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No hay actividad reciente</p>
          </div>
        ) : (
          activities.map((activity, index) => {
            const colors = levelColors[activity.level];
            
            return (
              <motion.div
                key={activity._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex gap-4 relative"
              >
                {/* Timeline line */}
                {index < activities.length - 1 && (
                  <div className="absolute left-4 top-10 w-px h-full bg-gray-700/50" />
                )}

                {/* Icon */}
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full ${colors.bg} ${colors.icon} flex items-center justify-center border ${colors.border} z-10`}
                >
                  {activityIcons[activity.type]}
                </div>

                {/* Content */}
                <div className="flex-1 pb-4">
                  <p className="text-gray-200 text-sm leading-relaxed">
                    {activity.message}
                  </p>
                  
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">
                      {formatRelativeTime(activity.timestamp)}
                    </span>
                    
                    {activity.agentId && (
                      <span className="text-xs text-blue-400">
                        • Agent: {activity.agentId}
                      </span>
                    )}
                    
                    {activity.taskId && (
                      <span className="text-xs text-purple-400">
                        • Task: {activity.taskId.substring(0, 8)}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
};
