'use client';

import React from 'react';

interface ToolResultCardProps {
  tool: string;
  result: any;
  renderer?: React.FC<{ data: any }>;
}

export default function ToolResultCard({ tool, result, renderer: Renderer }: ToolResultCardProps) {
  if (Renderer) {
    return (
      <div className="animate-fadeIn">
        <Renderer data={result} />
      </div>
    );
  }

  // Fallback renderer
  return (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 my-2 animate-fadeIn">
      <div className="flex items-center mb-2">
        <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Tool: {tool}
        </span>
      </div>
      <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}