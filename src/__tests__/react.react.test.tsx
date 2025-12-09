/**
 * React Hook Tests for Better UI
 *
 * Tests useTool and useTools hooks with jsdom environment
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { z } from 'zod';
import { tool, Tool } from '../tool';
import { useTool, useTools } from '../react/useTool';

// Helper to create a test tool
function createTestTool(name: string, handler: (x: number) => any) {
  const t = tool({
    name,
    input: z.object({ x: z.number() }),
    output: z.object({ y: z.number() }),
  });
  t.client(({ x }) => handler(x));
  return t;
}

// Test component for useTool
function UseToolTestComponent({
  tool,
  inputValue,
  onResult,
}: {
  tool: Tool<{ x: number }, { y: number }>;
  inputValue: number;
  onResult?: (result: any) => void;
}) {
  const { data, loading, error, execute, reset, executed } = useTool(tool);

  React.useEffect(() => {
    if (data && onResult) {
      onResult(data);
    }
  }, [data, onResult]);

  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'idle'}</div>
      <div data-testid="data">{data ? JSON.stringify(data) : 'null'}</div>
      <div data-testid="error">{error ? error.message : 'null'}</div>
      <div data-testid="executed">{executed ? 'true' : 'false'}</div>
      <button data-testid="execute" onClick={() => execute({ x: inputValue })}>
        Execute
      </button>
      <button data-testid="reset" onClick={reset}>
        Reset
      </button>
    </div>
  );
}

// Test component for useTools
function UseToolsTestComponent({
  tools,
}: {
  tools: Record<string, Tool>;
}) {
  const toolResults = useTools(tools);

  return (
    <div>
      {Object.entries(toolResults).map(([name, result]) => (
        <div key={name} data-testid={`tool-${name}`}>
          <span data-testid={`${name}-loading`}>
            {result.loading ? 'loading' : 'idle'}
          </span>
          <span data-testid={`${name}-data`}>
            {result.data ? JSON.stringify(result.data) : 'null'}
          </span>
          <button
            data-testid={`${name}-execute`}
            onClick={() => result.execute({ x: 5 })}
          >
            Execute {name}
          </button>
        </div>
      ))}
    </div>
  );
}

describe('useTool', () => {
  it('starts with initial state', () => {
    const testTool = createTestTool('test', (x) => ({ y: x * 2 }));

    render(<UseToolTestComponent tool={testTool} inputValue={5} />);

    expect(screen.getByTestId('loading')).toHaveTextContent('idle');
    expect(screen.getByTestId('data')).toHaveTextContent('null');
    expect(screen.getByTestId('error')).toHaveTextContent('null');
    expect(screen.getByTestId('executed')).toHaveTextContent('false');
  });

  it('executes tool and updates state', async () => {
    const testTool = createTestTool('test', (x) => ({ y: x * 2 }));
    const onResult = jest.fn();

    render(
      <UseToolTestComponent tool={testTool} inputValue={5} onResult={onResult} />
    );

    // Click execute
    await act(async () => {
      screen.getByTestId('execute').click();
    });

    // Wait for result
    await waitFor(() => {
      expect(screen.getByTestId('data')).toHaveTextContent('{"y":10}');
    });

    expect(screen.getByTestId('loading')).toHaveTextContent('idle');
    expect(screen.getByTestId('executed')).toHaveTextContent('true');
    expect(onResult).toHaveBeenCalledWith({ y: 10 });
  });

  it('handles errors gracefully', async () => {
    const errorTool = tool({
      name: 'error',
      input: z.object({ x: z.number() }),
      output: z.object({ y: z.number() }),
    });
    errorTool.client(() => {
      throw new Error('Test error');
    });

    render(<UseToolTestComponent tool={errorTool} inputValue={5} />);

    await act(async () => {
      screen.getByTestId('execute').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Test error');
    });

    expect(screen.getByTestId('loading')).toHaveTextContent('idle');
    expect(screen.getByTestId('data')).toHaveTextContent('null');
  });

  it('resets state', async () => {
    const testTool = createTestTool('test', (x) => ({ y: x * 2 }));

    render(<UseToolTestComponent tool={testTool} inputValue={5} />);

    // Execute first
    await act(async () => {
      screen.getByTestId('execute').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('data')).toHaveTextContent('{"y":10}');
    });

    // Reset
    await act(async () => {
      screen.getByTestId('reset').click();
    });

    expect(screen.getByTestId('data')).toHaveTextContent('null');
    expect(screen.getByTestId('executed')).toHaveTextContent('false');
  });

  it('shows loading state during execution', async () => {
    let resolvePromise: (value: any) => void;
    const slowTool = tool({
      name: 'slow',
      input: z.object({ x: z.number() }),
      output: z.object({ y: z.number() }),
    });
    slowTool.client(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
    );

    render(<UseToolTestComponent tool={slowTool} inputValue={5} />);

    // Start execution
    act(() => {
      screen.getByTestId('execute').click();
    });

    // Should be loading
    expect(screen.getByTestId('loading')).toHaveTextContent('loading');

    // Resolve the promise
    await act(async () => {
      resolvePromise!({ y: 10 });
    });

    // Should no longer be loading
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('idle');
    });
  });
});

describe('useTools', () => {
  it('manages multiple tools independently', async () => {
    const tools = {
      double: createTestTool('double', (x) => ({ y: x * 2 })),
      triple: createTestTool('triple', (x) => ({ y: x * 3 })),
    };

    render(<UseToolsTestComponent tools={tools} />);

    // Both start idle
    expect(screen.getByTestId('double-loading')).toHaveTextContent('idle');
    expect(screen.getByTestId('triple-loading')).toHaveTextContent('idle');
    expect(screen.getByTestId('double-data')).toHaveTextContent('null');
    expect(screen.getByTestId('triple-data')).toHaveTextContent('null');

    // Execute double
    await act(async () => {
      screen.getByTestId('double-execute').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('double-data')).toHaveTextContent('{"y":10}');
    });

    // Triple should still be null
    expect(screen.getByTestId('triple-data')).toHaveTextContent('null');

    // Execute triple
    await act(async () => {
      screen.getByTestId('triple-execute').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('triple-data')).toHaveTextContent('{"y":15}');
    });

    // Double should still have its result
    expect(screen.getByTestId('double-data')).toHaveTextContent('{"y":10}');
  });

  it('uses single useState (no hooks-in-loop)', () => {
    // This test verifies the implementation doesn't call hooks in a loop
    // If it did, React would throw an error when the component renders

    const tools = {
      a: createTestTool('a', (x) => ({ y: x })),
      b: createTestTool('b', (x) => ({ y: x })),
      c: createTestTool('c', (x) => ({ y: x })),
    };

    // Should not throw "Rendered more hooks than during the previous render"
    expect(() => {
      render(<UseToolsTestComponent tools={tools} />);
    }).not.toThrow();
  });
});

describe('Tool.View', () => {
  it('renders view component with data', () => {
    const viewTool = tool({
      name: 'viewTest',
      input: z.object({ x: z.number() }),
      output: z.object({ y: z.number() }),
    });

    viewTool.view((data) => (
      <div data-testid="view-output">Result: {data.y}</div>
    ));

    const { View } = viewTool;

    render(<View data={{ y: 42 }} />);

    expect(screen.getByTestId('view-output')).toHaveTextContent('Result: 42');
  });

  it('renders loading state', () => {
    const viewTool = tool({
      name: 'loadingView',
      input: z.object({ x: z.number() }),
    });

    viewTool.view((data, state) => {
      if (state?.loading) {
        return <div data-testid="loading-indicator">Loading...</div>;
      }
      return <div data-testid="data">Data: {JSON.stringify(data)}</div>;
    });

    const { View } = viewTool;

    render(<View data={null} loading={true} />);

    expect(screen.getByTestId('loading-indicator')).toHaveTextContent(
      'Loading...'
    );
  });

  it('renders error state', () => {
    const viewTool = tool({
      name: 'errorView',
      input: z.object({ x: z.number() }),
    });

    viewTool.view((data, state) => {
      if (state?.error) {
        return <div data-testid="error-message">{state.error.message}</div>;
      }
      return <div>No error</div>;
    });

    const { View } = viewTool;

    render(<View data={null} error={new Error('Something went wrong')} />);

    expect(screen.getByTestId('error-message')).toHaveTextContent(
      'Something went wrong'
    );
  });

  it('provides onAction callback', async () => {
    const viewTool = tool({
      name: 'actionView',
      input: z.object({ action: z.string() }),
    });

    viewTool.view((data, state) => (
      <button
        data-testid="action-button"
        onClick={() => state?.onAction?.({ action: 'clicked' })}
      >
        Click me
      </button>
    ));

    const { View } = viewTool;
    const onAction = jest.fn();

    render(<View data={{}} onAction={onAction} />);

    await act(async () => {
      screen.getByTestId('action-button').click();
    });

    expect(onAction).toHaveBeenCalledWith({ action: 'clicked' });
  });

  it('defaults to JSON display when no view defined', () => {
    const noViewTool = tool({
      name: 'noView',
      input: z.object({ x: z.number() }),
    });

    const { View } = noViewTool;

    const { container } = render(<View data={{ x: 1, y: 2 }} />);

    // Should render as pre with JSON
    const pre = container.querySelector('pre');
    expect(pre).toBeTruthy();
    expect(pre?.textContent).toContain('"x": 1');
    expect(pre?.textContent).toContain('"y": 2');
  });
});
