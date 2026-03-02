import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

interface HeaderProps {
  systemStatus?: 'operational' | 'degraded' | 'down';
}

export const Header = ({ systemStatus = 'operational' }: HeaderProps) => {
  const statusColors = {
    operational: 'bg-green-500',
    degraded: 'bg-yellow-500',
    down: 'bg-red-500'
  };

  const statusText = {
    operational: 'Operacional',
    degraded: 'Degradado',
    down: 'Fuera de servicio'
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="bg-navy-900 border-b border-navy-800 shadow-lg"
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-accent-600 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🚀</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-100">DevAlliance</h1>
              <p className="text-xs text-gray-400">Mission Control</p>
            </div>
          </Link>

          {/* System Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-navy-800 rounded-lg border border-navy-700">
              <motion.div
                className={`w-2 h-2 rounded-full ${statusColors[systemStatus]}`}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-sm text-gray-300">{statusText[systemStatus]}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
};
