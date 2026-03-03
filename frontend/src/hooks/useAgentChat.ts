import { useState, useCallback, useRef } from 'react';
import { sendChatMessage } from '../lib/api-client';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  error?: boolean;
}

export interface UseAgentChatReturn {
  messages: Message[];
  sendMessage: (text: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  clearChat: () => void;
}

/**
 * Hook para manejar chat con agentes
 */
export function useAgentChat(agentId: string): UseAgentChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionKeyRef = useRef<string | undefined>(undefined);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      // Clear previous errors
      setError(null);
      setIsLoading(true);

      // Add user message
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);

      try {
        // Send message to backend
        const response = await sendChatMessage(agentId, {
          message: text.trim(),
          sessionKey: sessionKeyRef.current,
          timeoutSeconds: 60,
        });

        if (!response.ok) {
          throw new Error(response.error || 'Failed to get response from agent');
        }

        // Update session key if provided
        if (response.sessionKey) {
          sessionKeyRef.current = response.sessionKey;
        }

        // Add agent response
        const agentMessage: Message = {
          id: `agent-${Date.now()}`,
          role: 'assistant',
          content: response.reply || 'No response received',
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, agentMessage]);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message.includes('429') || err.message.includes('overloaded')
              ? 'AI service temporarily unavailable. Please try again in a moment.'
              : err.message
            : 'Failed to send message';

        setError(errorMessage);

        // Add error message to chat
        const errorMsg: Message = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: errorMessage,
          timestamp: new Date(),
          error: true,
        };

        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [agentId]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
    sessionKeyRef.current = undefined;
  }, []);

  return {
    messages,
    sendMessage,
    isLoading,
    error,
    clearChat,
  };
}
