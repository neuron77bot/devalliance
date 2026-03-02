import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Cpu, MemoryStick, Activity, Clock } from 'lucide-react';
import { useState } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import type { AgentMetrics as AgentMetricsType } from '../../hooks/useMetrics';

interface AgentMetricsProps {
  metrics: AgentMetricsType | null;
  loading?: boolean;
}

// Mini sparkline component
const Sparkline = ({ data, color }: { data: number[]; color: string }) => {
  const chartData = data.map((value, index) => ({ index, value }));
  
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

// Formato de uptime
function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

export const AgentMetrics = ({ metrics, loading }: AgentMetricsProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (loading || !metrics) {
    return (
      <div className="mt-4 p-4 bg-gray-700/30 rounded-lg animate-pulse">
        <div className="h-4 bg-gray-600/50 rounded w-1/3" />
      </div>
    );
  }

  const cpuHistory = metrics.history.map(h => h.cpu);
  const memoryHistory = metrics.history.map(h => h.memory);
  const responseTimeHistory = metrics.history.map(h => h.responseTime);

  return (
    <div className="mt-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-gray-700/30 hover:bg-gray-700/40 rounded-lg transition-colors"
      >
        <span className="text-sm font-medium text-gray-300">
          Performance Metrics
        </span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-gray-800/30 rounded-b-lg space-y-4">
              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-blue-400" />
                  <div>
                    <p className="text-xs text-gray-400">CPU</p>
                    <p className="text-sm font-semibold text-gray-200">
                      {metrics.cpu}%
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <MemoryStick className="w-4 h-4 text-green-400" />
                  <div>
                    <p className="text-xs text-gray-400">Memory</p>
                    <p className="text-sm font-semibold text-gray-200">
                      {metrics.memory} MB
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-yellow-400" />
                  <div>
                    <p className="text-xs text-gray-400">Avg Response</p>
                    <p className="text-sm font-semibold text-gray-200">
                      {metrics.avgResponseTime}ms
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <div>
                    <p className="text-xs text-gray-400">Uptime</p>
                    <p className="text-sm font-semibold text-gray-200">
                      {formatUptime(metrics.uptime)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sparklines */}
              {metrics.history.length > 0 && (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">CPU Usage Trend</p>
                    <Sparkline data={cpuHistory} color="#3b82f6" />
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 mb-1">Memory Usage Trend</p>
                    <Sparkline data={memoryHistory} color="#10b981" />
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 mb-1">Response Time Trend</p>
                    <Sparkline data={responseTimeHistory} color="#f59e0b" />
                  </div>
                </div>
              )}

              {/* Task Stats */}
              <div className="pt-3 border-t border-gray-700/50 flex justify-between text-xs">
                <div>
                  <p className="text-gray-400">Tasks Completed</p>
                  <p className="text-green-400 font-semibold text-lg">
                    {metrics.tasksCompleted}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Tasks Failed</p>
                  <p className="text-red-400 font-semibold text-lg">
                    {metrics.tasksFailed}
                  </p>
                </div>
              </div>

              {/* Last Activity */}
              {metrics.lastActivity && (
                <div className="pt-3 border-t border-gray-700/50">
                  <p className="text-xs text-gray-400">Last Activity</p>
                  <p className="text-sm text-gray-300">
                    {new Date(metrics.lastActivity).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
