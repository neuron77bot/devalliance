import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import type { Agent } from '../../types/api';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  agent: Agent | null;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  agent
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Error deleting agent:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen || !agent) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-navy-900 rounded-lg shadow-xl max-w-md w-full border border-red-500/30"
        >
          {/* Header with warning icon */}
          <div className="p-6 border-b border-red-500/20">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/20 rounded-full">
                <AlertTriangle className="text-red-400" size={32} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Delete Agent</h2>
                <p className="text-gray-400 text-sm mt-1">This action cannot be undone</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-gray-300 mb-4">
              Are you sure you want to delete <span className="font-bold text-cyan-400">{agent.name}</span>?
            </p>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-2">
              <p className="text-sm text-red-300 font-medium">This will:</p>
              <ul className="text-sm text-red-200 space-y-1 list-disc list-inside">
                <li>Stop and remove the Docker container</li>
                <li>Delete all configuration files</li>
                <li>Remove the agent from the database</li>
                <li>Clear all workspace data</li>
              </ul>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 p-6 border-t border-red-500/20">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isDeleting}
              className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? 'Deleting...' : 'Delete Agent'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
