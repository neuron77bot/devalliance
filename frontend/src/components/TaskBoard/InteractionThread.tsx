import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageCircle, ArrowRightLeft, CheckCircle, XCircle, Clock, User } from 'lucide-react';
import { useTaskActions } from '../../hooks/useTasks';
import { useTaskInteractions } from '../../hooks/useTasks';
import type { Interaction } from '../../types/task';

interface InteractionThreadProps {
  taskId: string;
}

export function InteractionThread({ taskId }: InteractionThreadProps) {
  const { interactions, loading, refresh } = useTaskInteractions(taskId);
  const { addComment, submitting } = useTaskActions();
  
  const [newComment, setNewComment] = useState('');

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await addComment(taskId, { message: newComment, fromAgent: 'system' });
      setNewComment('');
      refresh();
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  const getInteractionIcon = (type: Interaction['type']) => {
    switch (type) {
      case 'comment':
        return <MessageCircle size={16} className="text-blue-400" />;
      case 'handoff_request':
        return <ArrowRightLeft size={16} className="text-yellow-400" />;
      case 'handoff_accept':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'handoff_reject':
        return <XCircle size={16} className="text-red-400" />;
      case 'status_change':
        return <Clock size={16} className="text-purple-400" />;
      case 'assignment':
        return <User size={16} className="text-cyan-400" />;
      default:
        return <MessageCircle size={16} className="text-gray-400" />;
    }
  };

  const getInteractionLabel = (type: Interaction['type']) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        <MessageCircle size={20} />
        Interactions ({interactions.length})
      </h3>

      {/* Interaction List */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        <AnimatePresence>
          {interactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No interactions yet
            </div>
          ) : (
            interactions.map((interaction, index) => (
              <motion.div
                key={interaction._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className="bg-navy-800/50 border border-navy-700 rounded-lg p-3"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {getInteractionIcon(interaction.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-300">
                        {getInteractionLabel(interaction.type)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(interaction.timestamp)}
                      </span>
                    </div>

                    {interaction.fromAgent && (
                      <div className="text-xs text-gray-400 mb-1">
                        From: <span className="text-cyan-400">{interaction.fromAgent}</span>
                        {interaction.toAgent && (
                          <> → To: <span className="text-cyan-400">{interaction.toAgent}</span></>
                        )}
                      </div>
                    )}

                    {interaction.message && (
                      <p className="text-sm text-gray-300 mt-2">
                        {interaction.message}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Add Comment Form */}
      <form onSubmit={handleAddComment} className="flex gap-2 pt-4 border-t border-navy-700">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 bg-navy-800 border border-navy-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
          disabled={submitting}
        />
        <button
          type="submit"
          disabled={submitting || !newComment.trim()}
          className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <Send size={16} />
          Send
        </button>
      </form>
    </div>
  );
}
