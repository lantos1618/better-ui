'use client';

import React, { useEffect, useState } from 'react';
import { AUITool } from '../index';
import { useAUI, useAUIRender } from '../client/use-aui';

interface AUIToolProps<TInput = any, TOutput = any> {
  tool: AUITool<TInput, TOutput>;
  input?: TInput;
  autoExecute?: boolean;
  onSuccess?: (data: TOutput) => void;
  onError?: (error: Error) => void;
  loadingComponent?: React.ReactNode;
  errorComponent?: (error: Error) => React.ReactNode;
}

export function AUITool<TInput = any, TOutput = any>({
  tool,
  input,
  autoExecute = false,
  onSuccess,
  onError,
  loadingComponent,
  errorComponent,
}: AUIToolProps<TInput, TOutput>) {
  const { execute, data, error, loading } = useAUI(tool);
  const [hasExecuted, setHasExecuted] = useState(false);
  const rendered = useAUIRender(tool, data, input);

  useEffect(() => {
    if (autoExecute && input && !hasExecuted) {
      setHasExecuted(true);
      execute(input)
        .then((result) => onSuccess?.(result))
        .catch((err) => onError?.(err));
    }
  }, [autoExecute, input, hasExecuted, execute, onSuccess, onError]);

  if (loading) {
    return <>{loadingComponent || <div>Loading...</div>}</>;
  }

  if (error) {
    return <>{errorComponent?.(error) || <div>Error: {error.message}</div>}</>;
  }

  return <>{rendered}</>;
}

// Compound component for more control
export namespace AUITool {
  export function Trigger<TInput = any, TOutput = any>({
    tool,
    input,
    children,
    onSuccess,
    onError,
  }: {
    tool: AUITool<TInput, TOutput>;
    input: TInput;
    children: (execute: () => Promise<void>) => React.ReactNode;
    onSuccess?: (data: TOutput) => void;
    onError?: (error: Error) => void;
  }) {
    const { execute } = useAUI(tool);

    const handleExecute = async () => {
      try {
        const result = await execute(input);
        onSuccess?.(result);
      } catch (err) {
        onError?.(err as Error);
      }
    };

    return <>{children(handleExecute)}</>;
  }

  export function Result<TInput = any, TOutput = any>({
    tool,
    data,
    input,
  }: {
    tool: AUITool<TInput, TOutput>;
    data: TOutput | null;
    input?: TInput;
  }) {
    const rendered = useAUIRender(tool, data, input);
    return <>{rendered}</>;
  }
}

// List component for rendering multiple tool results
export function AUIToolList<TInput = any, TOutput = any>({
  tools,
  inputs,
  autoExecute = false,
}: {
  tools: AUITool<TInput, TOutput>[];
  inputs?: Map<string, TInput>;
  autoExecute?: boolean;
}) {
  return (
    <div>
      {tools.map((tool) => (
        <AUITool
          key={tool.name}
          tool={tool}
          input={inputs?.get(tool.name)}
          autoExecute={autoExecute}
        />
      ))}
    </div>
  );
}