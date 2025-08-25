import React from 'react';
import { AUITool } from '../index';

interface ToolRendererProps {
  tool: AUITool;
  input?: any;
  result?: any;
  loading?: boolean;
  error?: Error;
}

export function ToolRenderer({ tool, input, result, loading, error }: ToolRendererProps) {
  if (!tool.renderer) {
    return (
      <div className="p-4 bg-gray-100 rounded">
        <pre className="text-sm">{JSON.stringify(result, null, 2)}</pre>
      </div>
    );
  }

  return tool.renderer({ data: result, input, loading, error });
}