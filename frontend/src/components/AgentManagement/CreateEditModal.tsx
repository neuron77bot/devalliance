import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus } from 'lucide-react';
import type { Agent } from '../../types/api';

interface CreateEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  agent?: Agent | null;
  mode: 'create' | 'edit';
}

export const CreateEditModal: React.FC<CreateEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  agent,
  mode
}) => {
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    description: '',
    capabilities: [] as string[],
    port: '',
    enableTelegram: false,
    telegramToken: ''
  });

  const [newCapability, setNewCapability] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load agent data when in edit mode
  useEffect(() => {
    if (mode === 'edit' && agent) {
      setFormData({
        name: agent.name,
        role: agent.role,
        description: agent.description,
        capabilities: agent.capabilities || [],
        port: '',
        enableTelegram: agent.telegram?.enabled || false,
        telegramToken: ''
      });
    } else {
      // Reset form when creating new agent
      setFormData({
        name: '',
        role: '',
        description: '',
        capabilities: [],
        port: '',
        enableTelegram: false,
        telegramToken: ''
      });
    }
    setErrors({});
  }, [mode, agent, isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.role.trim()) {
      newErrors.role = 'Role is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (formData.port && (parseInt(formData.port) < 1024 || parseInt(formData.port) > 65535)) {
      newErrors.port = 'Port must be between 1024 and 65535';
    }

    if (formData.enableTelegram && !formData.telegramToken.trim()) {
      newErrors.telegramToken = 'Telegram token is required when Telegram is enabled';
    }

    if (formData.telegramToken.trim() && formData.telegramToken.trim().length < 40) {
      newErrors.telegramToken = 'Invalid token format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData: any = {
        name: formData.name,
        role: formData.role,
        description: formData.description,
        capabilities: formData.capabilities
      };

      // Only include port for create mode
      if (mode === 'create' && formData.port) {
        submitData.port = parseInt(formData.port);
      }

      // Include Telegram config if enabled
      if (formData.enableTelegram) {
        submitData.enableTelegram = true;
        if (formData.telegramToken.trim()) {
          submitData.telegramToken = formData.telegramToken.trim();
        }
      }

      await onSave(submitData);
      onClose();
    } catch (error) {
      console.error('Error saving agent:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addCapability = () => {
    if (newCapability.trim() && !formData.capabilities.includes(newCapability.trim())) {
      setFormData({
        ...formData,
        capabilities: [...formData.capabilities, newCapability.trim()]
      });
      setNewCapability('');
    }
  };

  const removeCapability = (capability: string) => {
    setFormData({
      ...formData,
      capabilities: formData.capabilities.filter((c) => c !== capability)
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-navy-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-cyan-500/20"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-cyan-500/20">
            <h2 className="text-2xl font-bold text-cyan-400">
              {mode === 'create' ? 'Create New Agent' : 'Edit Agent'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-4 py-2 bg-navy-800 border ${
                  errors.name ? 'border-red-500' : 'border-cyan-500/30'
                } rounded-lg text-white focus:outline-none focus:border-cyan-400 transition-colors`}
                placeholder="e.g., Data Analyst"
                disabled={mode === 'edit'}
              />
              {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Role *
              </label>
              <input
                type="text"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className={`w-full px-4 py-2 bg-navy-800 border ${
                  errors.role ? 'border-red-500' : 'border-cyan-500/30'
                } rounded-lg text-white focus:outline-none focus:border-cyan-400 transition-colors`}
                placeholder="e.g., Data Analysis & Reporting"
              />
              {errors.role && <p className="text-red-400 text-sm mt-1">{errors.role}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className={`w-full px-4 py-2 bg-navy-800 border ${
                  errors.description ? 'border-red-500' : 'border-cyan-500/30'
                } rounded-lg text-white focus:outline-none focus:border-cyan-400 transition-colors resize-none`}
                placeholder="Describe what this agent does..."
              />
              {errors.description && (
                <p className="text-red-400 text-sm mt-1">{errors.description}</p>
              )}
            </div>

            {/* Port (only for create mode) */}
            {mode === 'create' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Port (optional)
                </label>
                <input
                  type="number"
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                  className={`w-full px-4 py-2 bg-navy-800 border ${
                    errors.port ? 'border-red-500' : 'border-cyan-500/30'
                  } rounded-lg text-white focus:outline-none focus:border-cyan-400 transition-colors`}
                  placeholder="Auto-assigned if empty"
                  min={1024}
                  max={65535}
                />
                {errors.port && <p className="text-red-400 text-sm mt-1">{errors.port}</p>}
                <p className="text-gray-400 text-sm mt-1">
                  Leave empty to auto-assign next available port
                </p>
              </div>
            )}

            {/* Capabilities */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Capabilities
              </label>
              
              {/* Add new capability */}
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newCapability}
                  onChange={(e) => setNewCapability(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCapability();
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-navy-800 border border-cyan-500/30 rounded-lg text-white focus:outline-none focus:border-cyan-400 transition-colors"
                  placeholder="Add a capability..."
                />
                <button
                  type="button"
                  onClick={addCapability}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Plus size={18} />
                  Add
                </button>
              </div>

              {/* Capability tags */}
              <div className="flex flex-wrap gap-2">
                {formData.capabilities.map((capability) => (
                  <div
                    key={capability}
                    className="flex items-center gap-2 px-3 py-1 bg-cyan-500/20 border border-cyan-500/40 rounded-full text-cyan-300 text-sm"
                  >
                    <span>{capability}</span>
                    <button
                      type="button"
                      onClick={() => removeCapability(capability)}
                      className="hover:text-cyan-100 transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Telegram Configuration */}
            <div className="space-y-4 pt-4 border-t border-cyan-500/20">
              <h3 className="text-lg font-semibold text-white">Telegram Integration</h3>
              
              {/* Enable Telegram Checkbox */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enableTelegram}
                  onChange={(e) => setFormData({ ...formData, enableTelegram: e.target.checked })}
                  className="mt-1 w-5 h-5 rounded border-cyan-500/30 bg-navy-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-navy-900"
                />
                <div>
                  <span className="text-white font-medium">Enable Telegram</span>
                  <p className="text-sm text-gray-400 mt-1">
                    Allow this agent to send and receive messages via Telegram
                  </p>
                </div>
              </label>

              {/* Telegram Token Input (conditional) */}
              {formData.enableTelegram && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Telegram Bot Token *
                  </label>
                  <input
                    type="password"
                    value={formData.telegramToken}
                    onChange={(e) => setFormData({ ...formData, telegramToken: e.target.value })}
                    className={`w-full px-4 py-2 bg-navy-800 border ${
                      errors.telegramToken ? 'border-red-500' : 'border-cyan-500/30'
                    } rounded-lg text-white focus:outline-none focus:border-cyan-400 transition-colors font-mono text-sm`}
                    placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                  />
                  {errors.telegramToken && (
                    <p className="text-red-400 text-sm mt-1">{errors.telegramToken}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Get your bot token from{' '}
                    <a
                      href="https://t.me/BotFather"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 underline"
                    >
                      @BotFather
                    </a>
                    {' '}on Telegram
                  </p>
                  {mode === 'edit' && agent?.telegram?.botUsername && (
                    <p className="text-xs text-green-400 mt-1">
                      Current bot: @{agent.telegram.botUsername}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4 border-t border-cyan-500/20">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Agent' : 'Save Changes'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
