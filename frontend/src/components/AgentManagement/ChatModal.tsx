import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, Trash2 } from 'lucide-react';
import { useAgentChat, type Message } from '../../hooks/useAgentChat';
import type { Agent } from '../../types/api';

interface ChatModalProps {
  agent: Agent;
  onClose: () => void;
}

// Helper function to format time
const formatTime = (date: Date) => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const ChatModal = ({ agent, onClose }: ChatModalProps) => {
  const { messages, sendMessage, isLoading, clearChat } = useAgentChat(agent.id);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const message = inputText;
    setInputText('');
    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    if (window.confirm('Are you sure you want to clear the chat history?')) {
      clearChat();
    }
  };

  const getStatusColor = () => {
    switch (agent.status) {
      case 'healthy':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-navy-900 rounded-xl border border-navy-700 shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="bg-navy-800 border-b border-navy-700 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${getStatusColor()} animate-pulse`} />
              <div>
                <h2 className="text-xl font-bold text-white">
                  Chat with {agent.name}
                </h2>
                <p className="text-sm text-gray-400">{agent.role}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button
                  onClick={handleClearChat}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Clear chat"
                  disabled={isLoading}
                >
                  <Trash2 size={18} />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white hover:bg-navy-700 rounded-lg transition-colors"
                aria-label="Close chat"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-6xl mb-4">💬</div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Start a conversation
                  </h3>
                  <p className="text-gray-400">
                    Send a message to {agent.name} to get started!
                  </p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} agentName={agent.name} />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}

            {/* Loading indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm">🤖</span>
                </div>
                <div className="bg-gray-700 text-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[70%]">
                  <div className="flex items-center gap-2">
                    <Loader2 className="animate-spin text-indigo-400" size={16} />
                    <span className="text-sm text-gray-300">Thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Input Area */}
          <div className="bg-navy-800 border-t border-navy-700 px-6 py-4">
            <div className="flex gap-3">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                className="flex-1 bg-navy-900 border border-navy-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none max-h-32 transition-colors"
                rows={1}
                disabled={isLoading}
                aria-label="Message input"
              />
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || isLoading}
                className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2 font-medium"
                aria-label="Send message"
              >
                <Send size={18} />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Press <kbd className="px-1.5 py-0.5 bg-navy-700 rounded text-gray-400">Enter</kbd> to send,{' '}
              <kbd className="px-1.5 py-0.5 bg-navy-700 rounded text-gray-400">Shift+Enter</kbd> for new line
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

interface MessageBubbleProps {
  message: Message;
  agentName: string;
}

const MessageBubble = ({ message, agentName }: MessageBubbleProps) => {
  const isUser = message.role === 'user';
  const isError = message.error;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`flex items-start gap-3 max-w-[70%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        {!isUser && (
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
            <span className="text-sm">🤖</span>
          </div>
        )}

        {/* Message Content */}
        <div className="flex flex-col gap-1">
          <div
            className={`rounded-2xl px-4 py-3 ${
              isUser
                ? 'bg-blue-600 text-white rounded-tr-sm'
                : isError
                ? 'bg-red-500/20 text-red-300 border border-red-500/40 rounded-tl-sm'
                : 'bg-gray-700 text-gray-100 rounded-tl-sm'
            }`}
          >
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          </div>

          {/* Timestamp */}
          <span className={`text-xs text-gray-500 ${isUser ? 'text-right' : 'text-left'}`}>
            {isUser ? 'You' : agentName} · {formatTime(message.timestamp)}
          </span>
        </div>

        {/* User Avatar */}
        {isUser && (
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
            <span className="text-sm">👤</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};
