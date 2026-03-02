import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Activity as ActivityIcon,
  CheckCircle,
  Clock,
  BarChart3
} from 'lucide-react';
import { useAgents } from '../hooks/useAgents';
import { useSystemMetrics, useAgentMetrics } from '../hooks/useMetrics';
import { useActivity } from '../hooks/useActivity';
import { useMetricsWebSocket } from '../hooks/useWebSocket';
import type { Agent } from '../types/api';
import { AgentGrid } from '../components/Dashboard/AgentGrid';
import { AgentDetailModal } from '../components/AgentDetail/AgentDetailModal';
import { KPICard } from '../components/Dashboard/KPICard';
import { MetricsChart } from '../components/Dashboard/MetricsChart';
import { ActivityTimeline } from '../components/Dashboard/ActivityTimeline';
import { LiveIndicator } from '../components/Dashboard/LiveIndicator';

export const HomePage = () => {
  const { agents, loading: agentsLoading } = useAgents();
  const { metrics: systemMetrics, loading: metricsLoading } = useSystemMetrics();
  const { metrics: agentMetrics } = useAgentMetrics();
  const { activities, loading: activitiesLoading } = useActivity({ limit: 50 });
  const { isConnected, metricsData } = useMetricsWebSocket();
  
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>();

  // Actualizar timestamp cuando llegan datos por WebSocket
  useEffect(() => {
    if (metricsData) {
      setLastUpdate(new Date());
    }
  }, [metricsData]);

  // Usar datos de WebSocket si están disponibles, sino usar polling
  const displayMetrics = metricsData?.system || systemMetrics;

  if (agentsLoading || metricsLoading) {
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

  // Preparar datos para gráficos
  const agentStatusData = [
    { name: 'Online', value: displayMetrics?.activeAgents || 0 },
    { name: 'Offline', value: displayMetrics?.inactiveAgents || 0 }
  ];

  const tasksByAgentData = agentMetrics.slice(0, 5).map(m => ({
    name: m.agentName,
    completed: m.tasksCompleted,
    failed: m.tasksFailed
  }));

  const responseTimeData = agentMetrics.slice(0, 10).map((m, i) => ({
    timestamp: new Date(Date.now() - (10 - i) * 60000).toISOString(),
    avgResponseTime: m.avgResponseTime
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-100 mb-2">
            Mission Control Dashboard
          </h1>
          <p className="text-gray-400">
            Monitorea y gestiona todos tus agentes de desarrollo en tiempo real
          </p>
        </div>
        <LiveIndicator isConnected={isConnected} lastUpdate={lastUpdate} />
      </div>

      {/* KPIs Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <KPICard
          title="Total Agents"
          value={displayMetrics?.totalAgents || 0}
          icon={Users}
          color="blue"
          loading={metricsLoading}
        />
        <KPICard
          title="Active Agents"
          value={displayMetrics?.activeAgents || 0}
          icon={ActivityIcon}
          color="green"
          loading={metricsLoading}
        />
        <KPICard
          title="Tasks Completed Today"
          value={displayMetrics?.tasksCompletedToday || 0}
          icon={CheckCircle}
          color="purple"
          loading={metricsLoading}
        />
        <KPICard
          title="Avg Response Time"
          value={`${displayMetrics?.avgResponseTime || 0}ms`}
          icon={Clock}
          color="yellow"
          loading={metricsLoading}
        />
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MetricsChart
          title="Response Time Over Time"
          data={responseTimeData}
          type="line"
          dataKeys={['avgResponseTime']}
          colors={['#3b82f6']}
          loading={metricsLoading}
        />
        
        <MetricsChart
          title="Agent Status Distribution"
          data={agentStatusData}
          type="pie"
          colors={['#10b981', '#ef4444']}
          loading={metricsLoading}
        />
      </div>

      {/* Tasks by Agent Chart */}
      <MetricsChart
        title="Tasks by Agent"
        data={tasksByAgentData}
        type="bar"
        dataKeys={['completed', 'failed']}
        colors={['#10b981', '#ef4444']}
        loading={metricsLoading}
        height={250}
      />

      {/* Activity Timeline and Agents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold text-gray-100 mb-6 flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Agentes
          </h2>
          <AgentGrid
            agents={agents}
            onAgentClick={setSelectedAgent}
            showMetrics={true}
          />
        </div>

        <div>
          <ActivityTimeline
            activities={activities}
            loading={activitiesLoading}
            maxHeight="800px"
          />
        </div>
      </div>

      {/* Agent Detail Modal */}
      <AgentDetailModal
        agent={selectedAgent}
        isOpen={selectedAgent !== null}
        onClose={() => setSelectedAgent(null)}
      />
    </div>
  );
};
