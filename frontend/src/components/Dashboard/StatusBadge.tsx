import { motion } from 'framer-motion';
import type { AgentStatus } from '../../types/api';
import { getStatusColor, getStatusBgColor, getStatusText } from '../../utils/helpers';

interface StatusBadgeProps {
  status: AgentStatus;
  showText?: boolean;
}

export const StatusBadge = ({ status, showText = true }: StatusBadgeProps) => {
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${getStatusBgColor(status)}`}>
      {/* Dot con animación de pulso para status healthy */}
      <motion.div
        className={`w-2 h-2 rounded-full ${getStatusColor(status).replace('text-', 'bg-')}`}
        animate={status === 'healthy' ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      />
      
      {showText && (
        <span className={`text-sm font-medium ${getStatusColor(status)}`}>
          {getStatusText(status)}
        </span>
      )}
    </div>
  );
};
