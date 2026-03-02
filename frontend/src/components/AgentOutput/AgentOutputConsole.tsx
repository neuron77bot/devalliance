import React, { useRef, useEffect, useState } from 'react';
import { AgentOutput, OutputType } from '../../types/agent-output';

interface AgentOutputConsoleProps {
  outputs: AgentOutput[];
  autoScroll?: boolean;
  maxHeight?: string;
  showTimestamps?: boolean;
  filterTypes?: OutputType[];
}

export function AgentOutputConsole({
  outputs,
  autoScroll = true,
  maxHeight = '400px',
  showTimestamps = true,
  filterTypes
}: AgentOutputConsoleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<OutputType | 'all'>('all');

  // Auto-scroll al final cuando hay nuevo output
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [outputs, autoScroll]);

  // Filtrar outputs
  const filteredOutputs = outputs.filter(output => {
    if (filter === 'all') return true;
    return output.type === filter;
  });

  // Copiar todo el output al clipboard
  const copyToClipboard = () => {
    const text = filteredOutputs
      .map(o => `[${new Date(o.timestamp).toLocaleTimeString()}] ${o.content}`)
      .join('\n');
    
    navigator.clipboard.writeText(text);
  };

  // Get icon para cada tipo
  const getTypeIcon = (type: OutputType) => {
    switch (type) {
      case 'output': return '📝';
      case 'progress': return '⏳';
      case 'tool_call': return '🔧';
      case 'error': return '❌';
      case 'result': return '✅';
      default: return '•';
    }
  };

  // Get color para cada tipo
  const getTypeColor = (type: OutputType) => {
    switch (type) {
      case 'output': return 'text-gray-300';
      case 'progress': return 'text-blue-400';
      case 'tool_call': return 'text-purple-400';
      case 'error': return 'text-red-400';
      case 'result': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-2 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-300">Output Console</span>
          <div className="flex gap-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-2 py-1 text-xs rounded ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('output')}
              className={`px-2 py-1 text-xs rounded ${
                filter === 'output'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Output
            </button>
            <button
              onClick={() => setFilter('error')}
              className={`px-2 py-1 text-xs rounded ${
                filter === 'error'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Errors
            </button>
            <button
              onClick={() => setFilter('tool_call')}
              className={`px-2 py-1 text-xs rounded ${
                filter === 'tool_call'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Tools
            </button>
          </div>
        </div>
        
        <div className="flex gap-2">
          <span className="text-xs text-gray-400">
            {filteredOutputs.length} {filteredOutputs.length === 1 ? 'line' : 'lines'}
          </span>
          <button
            onClick={copyToClipboard}
            className="text-xs text-gray-400 hover:text-white transition-colors"
            title="Copy to clipboard"
          >
            📋 Copy
          </button>
        </div>
      </div>

      {/* Console Output */}
      <div
        ref={containerRef}
        className="font-mono text-sm overflow-y-auto bg-gray-950 p-4"
        style={{ maxHeight }}
      >
        {filteredOutputs.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            No output yet...
          </div>
        ) : (
          <div className="space-y-1">
            {filteredOutputs.map((output, index) => (
              <div key={output._id || index} className="flex gap-2 leading-relaxed">
                <span className="text-gray-600 select-none shrink-0">
                  {getTypeIcon(output.type)}
                </span>
                {showTimestamps && (
                  <span className="text-gray-600 text-xs shrink-0 mt-0.5">
                    [{new Date(output.timestamp).toLocaleTimeString()}]
                  </span>
                )}
                <span className={`${getTypeColor(output.type)} break-all`}>
                  {output.content}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
