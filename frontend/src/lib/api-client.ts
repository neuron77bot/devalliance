/**
 * API Client helper para manejar llamadas al backend
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/app/api';

export class ApiError extends Error {
  status: number;
  statusText: string;

  constructor(
    message: string,
    status: number,
    statusText: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
  }
}

/**
 * Función helper para hacer peticiones HTTP con manejo de errores
 */
export async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  // Solo agregar Content-Type si hay body
  const headers: Record<string, string> = {
    ...options?.headers as Record<string, string>,
  };
  
  if (options?.body) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Manejo de errores HTTP
    if (!response.ok) {
      const errorMessage = await response.text().catch(() => 'Network error');
      throw new ApiError(
        errorMessage || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        response.statusText
      );
    }

    // Parse JSON response
    const data = await response.json();
    return data as T;
  } catch (error) {
    // Re-throw ApiError
    if (error instanceof ApiError) {
      throw error;
    }

    // Network or parsing errors
    if (error instanceof Error) {
      throw new ApiError(
        `Network error: ${error.message}`,
        0,
        'Network Error'
      );
    }

    throw new ApiError('Unknown error occurred', 0, 'Unknown Error');
  }
}

/**
 * Chat API Types
 */
export interface ChatRequest {
  message: string;
  sessionKey?: string;
  timeoutSeconds?: number;
}

export interface ChatResponse {
  ok: boolean;
  reply?: string;
  sessionKey?: string;
  error?: string;
}

/**
 * Send a chat message to an agent
 */
export async function sendChatMessage(
  agentId: string,
  request: ChatRequest
): Promise<ChatResponse> {
  return fetchAPI<ChatResponse>(`/agents/${agentId}/chat`, {
    method: 'POST',
    body: JSON.stringify(request),
  });
}
