import { motion } from 'framer-motion';
import { Wifi, WifiOff } from 'lucide-react';

interface LiveIndicatorProps {
  isConnected: boolean;
  lastUpdate?: Date;
}

export const LiveIndicator = ({ isConnected, lastUpdate }: LiveIndicatorProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
        isConnected
          ? 'bg-green-500/10 border border-green-500/30'
          : 'bg-red-500/10 border border-red-500/30'
      }`}
    >
      {isConnected ? (
        <>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Wifi className="w-4 h-4 text-green-400" />
          </motion.div>
          <div className="text-xs">
            <p className="text-green-400 font-medium">Live Updates</p>
            {lastUpdate && (
              <p className="text-gray-400">
                {lastUpdate.toLocaleTimeString()}
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 text-red-400" />
          <div className="text-xs">
            <p className="text-red-400 font-medium">Disconnected</p>
            <p className="text-gray-400">Reconnecting...</p>
          </div>
        </>
      )}
    </motion.div>
  );
};
