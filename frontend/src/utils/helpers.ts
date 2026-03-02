import type { AgentStatus } from '../types/api';

/**
 * Formatea segundos a formato legible (ej: "2h 15m")
 */
export const formatUptime = (seconds: number): string => {
  if (seconds === 0) return '0s';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 && hours === 0) parts.push(`${secs}s`);
  
  return parts.join(' ') || '0s';
};

/**
 * Formatea milisegundos a formato legible
 */
export const formatResponseTime = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

/**
 * Obtiene el color correspondiente a un status
 */
export const getStatusColor = (status: AgentStatus): string => {
  const colors = {
    healthy: 'text-green-500',
    warning: 'text-yellow-500',
    error: 'text-red-500',
    offline: 'text-gray-500'
  };
  
  return colors[status] || colors.offline;
};

/**
 * Obtiene el color de fondo para un status badge
 */
export const getStatusBgColor = (status: AgentStatus): string => {
  const colors = {
    healthy: 'bg-green-500/20 border-green-500/50',
    warning: 'bg-yellow-500/20 border-yellow-500/50',
    error: 'bg-red-500/20 border-red-500/50',
    offline: 'bg-gray-500/20 border-gray-500/50'
  };
  
  return colors[status] || colors.offline;
};

/**
 * Obtiene el texto correspondiente a un status
 */
export const getStatusText = (status: AgentStatus): string => {
  const texts = {
    healthy: 'Saludable',
    warning: 'Advertencia',
    error: 'Error',
    offline: 'Desconectado'
  };
  
  return texts[status] || 'Desconocido';
};

/**
 * Trunca texto largo
 */
export const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

/**
 * Formatea timestamp a fecha legible
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};
