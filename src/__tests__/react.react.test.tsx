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

describe('useTool advanced', () => {
  it('calls onSuccess callback after successful execution', async () => {
    const testTool = createTestTool('successCallback', (x) => ({ y: x * 2 }));
    const onSuccess = jest.fn();
    const onError = jest.fn();

    function TestComponent() {
      const { execute } = useTool(testTool, undefined, { onSuccess, onError });
      return (
        <button data-testid="execute" onClick={() => execute({ x: 5 })}>
          Execute
        </button>
      );
    }

    render(<TestComponent />);

    await act(async () => {
      screen.getByTestId('execute').click();
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith({ y: 10 });
    });
    expect(onError).not.toHaveBeenCalled();
  });

  it('calls onError callback after failed execution', async () => {
    const errorTool = tool({
      name: 'errorCallback',
      input: z.object({ x: z.number() }),
    });
    errorTool.client(() => {
      throw new Error('Expected error');
    });

    const onSuccess = jest.fn();
    const onError = jest.fn();

    function TestComponent() {
      const { execute } = useTool(errorTool, undefined, { onSuccess, onError });
      return (
        <button data-testid="execute" onClick={() => execute({ x: 5 })}>
          Execute
        </button>
      );
    }

    render(<TestComponent />);

    await act(async () => {
      screen.getByTestId('execute').click();
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0][0].message).toBe('Expected error');
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('auto-executes when auto option is true', async () => {
    const testTool = createTestTool('autoExec', (x) => ({ y: x * 3 }));

    function TestComponent({ value }: { value: number }) {
      const { data, loading } = useTool(testTool, { x: value }, { auto: true });
      return (
        <div>
          <div data-testid="loading">{loading ? 'loading' : 'idle'}</div>
          <div data-testid="data">{data ? JSON.stringify(data) : 'null'}</div>
        </div>
      );
    }

    render(<TestComponent value={7} />);

    // Should auto-execute
    await waitFor(() => {
      expect(screen.getByTestId('data')).toHaveTextContent('{"y":21}');
    });
  });

  it('sets error when no input provided', async () => {
    const testTool = createTestTool('noInput', (x) => ({ y: x }));

    function TestComponent() {
      const { error, execute } = useTool(testTool);
      return (
        <div>
          <div data-testid="error">{error ? error.message : 'null'}</div>
          <button data-testid="execute" onClick={() => execute()}>
            Execute
          </button>
        </div>
      );
    }

    render(<TestComponent />);

    await act(async () => {
      screen.getByTestId('execute').click();
    });

    expect(screen.getByTestId('error')).toHaveTextContent(
      'No input provided to tool'
    );
  });

  it('converts non-Error throws to Error objects', async () => {
    const stringThrowTool = tool({
      name: 'stringThrow',
      input: z.object({ x: z.number() }),
    });
    stringThrowTool.client(() => {
      throw 'String error message';
    });

    function TestComponent() {
      const { error, execute } = useTool(stringThrowTool);
      return (
        <div>
          <div data-testid="error">{error ? error.message : 'null'}</div>
          <button data-testid="execute" onClick={() => execute({ x: 5 })}>
            Execute
          </button>
        </div>
      );
    }

    render(<TestComponent />);

    await act(async () => {
      screen.getByTestId('execute').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent(
        'String error message'
      );
    });
  });

  it('returns null from execute on error', async () => {
    const errorTool = tool({
      name: 'returnNull',
      input: z.object({ x: z.number() }),
    });
    errorTool.client(() => {
      throw new Error('Fail');
    });

    let executeResult: any = 'not-set';

    function TestComponent() {
      const { execute } = useTool(errorTool);
      return (
        <button
          data-testid="execute"
          onClick={async () => {
            executeResult = await execute({ x: 5 });
          }}
        >
          Execute
        </button>
      );
    }

    render(<TestComponent />);

    await act(async () => {
      screen.getByTestId('execute').click();
    });

    await waitFor(() => {
      expect(executeResult).toBeNull();
    });
  });

  it('returns result from execute on success', async () => {
    const testTool = createTestTool('returnResult', (x) => ({ y: x * 4 }));

    let executeResult: any = null;

    function TestComponent() {
      const { execute } = useTool(testTool);
      return (
        <button
          data-testid="execute"
          onClick={async () => {
            executeResult = await execute({ x: 3 });
          }}
        >
          Execute
        </button>
      );
    }

    render(<TestComponent />);

    await act(async () => {
      screen.getByTestId('execute').click();
    });

    await waitFor(() => {
      expect(executeResult).toEqual({ y: 12 });
    });
  });

  it('handles rapid successive executions', async () => {
    let callCount = 0;
    const slowTool = tool({
      name: 'rapid',
      input: z.object({ x: z.number() }),
      output: z.object({ y: z.number() }),
    });
    slowTool.client(async ({ x }) => {
      callCount++;
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { y: x };
    });

    function TestComponent() {
      const { data, execute } = useTool(slowTool);
      return (
        <div>
          <div data-testid="data">{data ? JSON.stringify(data) : 'null'}</div>
          <button data-testid="exec1" onClick={() => execute({ x: 1 })}>
            Exec 1
          </button>
          <button data-testid="exec2" onClick={() => execute({ x: 2 })}>
            Exec 2
          </button>
          <button data-testid="exec3" onClick={() => execute({ x: 3 })}>
            Exec 3
          </button>
        </div>
      );
    }

    render(<TestComponent />);

    // Rapid fire executions
    act(() => {
      screen.getByTestId('exec1').click();
      screen.getByTestId('exec2').click();
      screen.getByTestId('exec3').click();
    });

    // Wait for all to complete
    await waitFor(
      () => {
        expect(screen.getByTestId('data')).not.toHaveTextContent('null');
      },
      { timeout: 500 }
    );

    // All three should have been called
    expect(callCount).toBe(3);
  });

  it('clears error on successful execution after failure', async () => {
    let shouldFail = true;
    const conditionalTool = tool({
      name: 'conditional',
      input: z.object({ x: z.number() }),
    });
    conditionalTool.client(({ x }) => {
      if (shouldFail) {
        throw new Error('Intentional failure');
      }
      return { y: x * 2 };
    });

    function TestComponent() {
      const { data, error, execute } = useTool(conditionalTool);
      return (
        <div>
          <div data-testid="data">{data ? JSON.stringify(data) : 'null'}</div>
          <div data-testid="error">{error ? error.message : 'null'}</div>
          <button data-testid="execute" onClick={() => execute({ x: 5 })}>
            Execute
          </button>
        </div>
      );
    }

    render(<TestComponent />);

    // First execution - fails
    await act(async () => {
      screen.getByTestId('execute').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Intentional failure');
    });

    // Second execution - succeeds
    shouldFail = false;
    await act(async () => {
      screen.getByTestId('execute').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('data')).toHaveTextContent('{"y":10}');
      expect(screen.getByTestId('error')).toHaveTextContent('null');
    });
  });
});

describe('useTools advanced', () => {
  it('handles errors independently per tool', async () => {
    const successTool = createTestTool('success', (x) => ({ y: x * 2 }));
    const failTool = tool({
      name: 'fail',
      input: z.object({ x: z.number() }),
      output: z.object({ y: z.number() }),
    });
    failTool.client(() => {
      throw new Error('Tool failed');
    });

    function TestComponent() {
      const tools = useTools({ success: successTool, fail: failTool });
      return (
        <div>
          <div data-testid="success-data">
            {tools.success.data ? JSON.stringify(tools.success.data) : 'null'}
          </div>
          <div data-testid="success-error">
            {tools.success.error ? tools.success.error.message : 'null'}
          </div>
          <div data-testid="fail-data">
            {tools.fail.data ? JSON.stringify(tools.fail.data) : 'null'}
          </div>
          <div data-testid="fail-error">
            {tools.fail.error ? tools.fail.error.message : 'null'}
          </div>
          <button
            data-testid="exec-success"
            onClick={() => tools.success.execute({ x: 5 })}
          >
            Exec Success
          </button>
          <button
            data-testid="exec-fail"
            onClick={() => tools.fail.execute({ x: 5 })}
          >
            Exec Fail
          </button>
        </div>
      );
    }

    render(<TestComponent />);

    // Execute both
    await act(async () => {
      screen.getByTestId('exec-success').click();
      screen.getByTestId('exec-fail').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('success-data')).toHaveTextContent('{"y":10}');
      expect(screen.getByTestId('success-error')).toHaveTextContent('null');
      expect(screen.getByTestId('fail-data')).toHaveTextContent('null');
      expect(screen.getByTestId('fail-error')).toHaveTextContent('Tool failed');
    });
  });

  it('provides reset function per tool', async () => {
    const tools = {
      a: createTestTool('a', (x) => ({ y: x })),
      b: createTestTool('b', (x) => ({ y: x * 2 })),
    };

    function TestComponent() {
      const result = useTools(tools);
      return (
        <div>
          <div data-testid="a-data">
            {result.a.data ? JSON.stringify(result.a.data) : 'null'}
          </div>
          <div data-testid="b-data">
            {result.b.data ? JSON.stringify(result.b.data) : 'null'}
          </div>
          <button data-testid="exec-a" onClick={() => result.a.execute({ x: 1 })}>
            Exec A
          </button>
          <button data-testid="exec-b" onClick={() => result.b.execute({ x: 1 })}>
            Exec B
          </button>
          <button data-testid="reset-a" onClick={() => result.a.reset()}>
            Reset A
          </button>
        </div>
      );
    }

    render(<TestComponent />);

    // Execute both
    await act(async () => {
      screen.getByTestId('exec-a').click();
      screen.getByTestId('exec-b').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('a-data')).toHaveTextContent('{"y":1}');
      expect(screen.getByTestId('b-data')).toHaveTextContent('{"y":2}');
    });

    // Reset only A
    await act(async () => {
      screen.getByTestId('reset-a').click();
    });

    expect(screen.getByTestId('a-data')).toHaveTextContent('null');
    expect(screen.getByTestId('b-data')).toHaveTextContent('{"y":2}');
  });

  it('handles no input error in useTools', async () => {
    const testTool = createTestTool('noInputMulti', (x) => ({ y: x }));
    const onError = jest.fn();

    function TestComponent() {
      const tools = useTools({ test: testTool }, { onError });
      return (
        <div>
          <div data-testid="error">
            {tools.test.error ? tools.test.error.message : 'null'}
          </div>
          <button data-testid="execute" onClick={() => tools.test.execute()}>
            Execute
          </button>
        </div>
      );
    }

    render(<TestComponent />);

    await act(async () => {
      screen.getByTestId('execute').click();
    });

    expect(screen.getByTestId('error')).toHaveTextContent(
      'No input provided to tool'
    );
    expect(onError).toHaveBeenCalled();
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
