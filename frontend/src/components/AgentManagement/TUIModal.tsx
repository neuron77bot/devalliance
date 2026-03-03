import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal as TerminalIcon, X, Copy, AlertCircle } from 'lucide-react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

interface TUIModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
  agentName: string;
}

interface TUITokenResponse {
  ok: boolean;
  token?: string;
  wsUrl?: string;
  command?: string;
  expiresAt?: string;
  error?: string;
}

export const TUIModal = ({ isOpen, onClose, agentId, agentName }: TUIModalProps) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tuiData, setTuiData] = useState<TUITokenResponse | null>(null);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const initializeTUI = async () => {
      setLoading(true);
      setError(null);
      setShowFallback(false);

      try {
        // Fetch TUI token
        const response = await fetch(`http://localhost:3000/api/agents/${agentId}/tui-token`);
        const data: TUITokenResponse = await response.json();

        if (!data.ok || !data.wsUrl || !data.token) {
          throw new Error(data.error || 'Failed to get TUI credentials');
        }

        setTuiData(data);

        // Initialize xterm.js
        if (!terminalRef.current) return;

        const term = new Terminal({
          cursorBlink: true,
          fontSize: 14,
          fontFamily: '"Fira Code", "Courier New", monospace',
          theme: {
            background: '#0f172a', // navy-900
            foreground: '#e2e8f0', // gray-200
            cursor: '#06b6d4', // cyan-500
            black: '#1e293b',
            red: '#ef4444',
            green: '#10b981',
            yellow: '#f59e0b',
            blue: '#3b82f6',
            magenta: '#a855f7',
            cyan: '#06b6d4',
            white: '#f1f5f9',
            brightBlack: '#475569',
            brightRed: '#f87171',
            brightGreen: '#34d399',
            brightYellow: '#fbbf24',
            brightBlue: '#60a5fa',
            brightMagenta: '#c084fc',
            brightCyan: '#22d3ee',
            brightWhite: '#ffffff'
          }
        });

        const fit = new FitAddon();
        const webLinks = new WebLinksAddon();
        
        term.loadAddon(fit);
        term.loadAddon(webLinks);
        
        term.open(terminalRef.current);
        fit.fit();

        terminalInstance.current = term;
        fitAddon.current = fit;

        // Welcome message
        term.writeln('\x1b[1;36m╔═══════════════════════════════════════╗\x1b[0m');
        term.writeln('\x1b[1;36m║     DevAlliance Terminal UI (TUI)    ║\x1b[0m');
        term.writeln('\x1b[1;36m╚═══════════════════════════════════════╝\x1b[0m');
        term.writeln('');
        term.writeln(`\x1b[1;33m🤖 Agent:\x1b[0m ${agentName} (${agentId})`);
        term.writeln(`\x1b[1;33m🔗 Connecting to:\x1b[0m ${data.wsUrl}`);
        term.writeln('');

        // Connect to WebSocket
        const ws = new WebSocket(data.wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          term.writeln('\x1b[1;32m✓ Connected!\x1b[0m');
          term.writeln('');
          term.writeln('\x1b[2mType your message and press Enter...\x1b[0m');
          term.writeln('');
          
          // Authentication with token
          ws.send(JSON.stringify({
            jsonrpc: '2.0',
            method: 'auth',
            params: { token: data.token },
            id: 1
          }));
          
          setLoading(false);
        };

        ws.onerror = (err) => {
          console.error('WebSocket error:', err);
          term.writeln('');
          term.writeln('\x1b[1;31m✗ Connection failed!\x1b[0m');
          term.writeln('\x1b[33mShowing fallback command...\x1b[0m');
          setShowFallback(true);
          setLoading(false);
        };

        ws.onclose = () => {
          term.writeln('');
          term.writeln('\x1b[1;33m⚠ Connection closed\x1b[0m');
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            // Display message based on type
            if (message.method === 'output') {
              term.write(message.params?.text || '');
            } else if (message.result) {
              term.writeln(`\x1b[32m${JSON.stringify(message.result, null, 2)}\x1b[0m`);
            } else if (message.error) {
              term.writeln(`\x1b[31mError: ${message.error.message}\x1b[0m`);
            }
          } catch (e) {
            // Plain text message
            term.write(event.data);
          }
        };

        // Handle user input
        let inputBuffer = '';
        term.onData((data) => {
          const code = data.charCodeAt(0);
          
          if (code === 13) { // Enter
            term.writeln('');
            if (inputBuffer.trim() && ws.readyState === WebSocket.OPEN) {
              // Send message to agent
              ws.send(JSON.stringify({
                jsonrpc: '2.0',
                method: 'chat',
                params: {
                  message: inputBuffer.trim(),
                  sessionKey: 'tui'
                },
                id: Date.now()
              }));
              term.writeln(`\x1b[2m> ${inputBuffer}\x1b[0m`);
            }
            inputBuffer = '';
          } else if (code === 127) { // Backspace
            if (inputBuffer.length > 0) {
              inputBuffer = inputBuffer.slice(0, -1);
              term.write('\b \b');
            }
          } else if (code >= 32) { // Printable characters
            inputBuffer += data;
            term.write(data);
          }
        });

        // Handle window resize
        const handleResize = () => {
          if (fitAddon.current) {
            fitAddon.current.fit();
          }
        };
        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
        };

      } catch (err: any) {
        console.error('TUI initialization error:', err);
        setError(err.message || 'Failed to initialize terminal');
        setShowFallback(true);
        setLoading(false);
      }
    };

    initializeTUI();

    return () => {
      // Cleanup
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (terminalInstance.current) {
        terminalInstance.current.dispose();
        terminalInstance.current = null;
      }
    };
  }, [isOpen, agentId, agentName]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-navy-900 rounded-lg shadow-2xl border border-navy-700 w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-navy-800 bg-navy-950">
              <div className="flex items-center gap-3">
                <TerminalIcon className="w-6 h-6 text-cyan-400" />
                <div>
                  <h2 className="text-xl font-bold text-gray-100">Terminal UI</h2>
                  <p className="text-sm text-gray-400">{agentName}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-200 hover:bg-navy-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Terminal Container */}
            <div className="flex-1 overflow-hidden p-4 bg-navy-900">
              {loading && !showFallback && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Conectando con {agentName}...</p>
                  </div>
                </div>
              )}

              {error && !showFallback && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-md">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <p className="text-gray-200 mb-2 font-semibold">Error</p>
                    <p className="text-gray-400 text-sm">{error}</p>
                  </div>
                </div>
              )}

              {showFallback && tuiData?.command && (
                <div className="flex items-center justify-center h-full">
                  <div className="max-w-2xl w-full bg-navy-800 rounded-lg border border-navy-700 p-6">
                    <div className="flex items-start gap-3 mb-4">
                      <AlertCircle className="w-6 h-6 text-yellow-500 mt-1" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-200 mb-2">
                          WebSocket no disponible desde el navegador
                        </h3>
                        <p className="text-gray-400 text-sm mb-4">
                          Para usar el Terminal UI, ejecuta este comando en tu terminal:
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-navy-950 rounded-lg p-4 border border-navy-700">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-xs text-gray-500">bash</code>
                        <button
                          onClick={() => tuiData.command && copyToClipboard(tuiData.command)}
                          className="flex items-center gap-2 px-3 py-1 text-xs bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                          Copiar
                        </button>
                      </div>
                      <pre className="text-sm text-gray-200 font-mono break-all whitespace-pre-wrap">
                        {tuiData.command}
                      </pre>
                    </div>

                    <p className="text-xs text-gray-500 mt-4">
                      Token válido hasta: {tuiData.expiresAt ? new Date(tuiData.expiresAt).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                </div>
              )}

              {!loading && !error && !showFallback && (
                <div 
                  ref={terminalRef} 
                  className="h-full w-full rounded-lg overflow-hidden"
                  style={{ backgroundColor: '#0f172a' }}
                />
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-navy-800 bg-navy-950">
              <p className="text-xs text-gray-500 text-center">
                Presiona <kbd className="px-2 py-1 bg-navy-800 rounded text-gray-400">Esc</kbd> o haz clic en ✕ para cerrar
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
