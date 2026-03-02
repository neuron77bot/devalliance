import type { Gateway } from '../../types/api';

interface GatewayStatusProps {
  gateway: Gateway;
  status: 'healthy' | 'warning' | 'error' | 'offline';
}

export const GatewayStatus = ({ gateway, status }: GatewayStatusProps) => {
  const isOnline = status === 'healthy' || status === 'warning';

  return (
    <div className="bg-navy-800 rounded-lg p-4 border border-navy-700">
      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Gateway</h3>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Estado</span>
          <span className={`text-sm font-medium ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
            {isOnline ? 'En línea' : 'Desconectado'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">URL</span>
          <code className="text-sm text-gray-300 bg-navy-900 px-2 py-1 rounded">
            {gateway.url}
          </code>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Puerto</span>
          <code className="text-sm text-gray-300 bg-navy-900 px-2 py-1 rounded">
            {gateway.port}
          </code>
        </div>

        {/* Indicador de conexión */}
        <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
          <span>{isOnline ? 'Conectado y operativo' : 'Sin conexión'}</span>
        </div>
      </div>
    </div>
  );
};
