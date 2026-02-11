/**
 * React Hook Tests for useToolStream
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { z } from 'zod';
import { tool, Tool } from '../tool';
import { useToolStream } from '../react/useToolStream';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Shared output type for test tools
type TestOutput = Record<string, string | number | boolean>;

// Test component that renders useToolStream state
function StreamTestComponent({
  tool: t,
  input,
  onFinalData,
}: {
  tool: Tool<{ x: number }, TestOutput>;
  input: number;
  onFinalData?: (data: TestOutput) => void;
}) {
  const { data, finalData, streaming, loading, error, execute, reset } =
    useToolStream(t, {
      onSuccess: onFinalData,
    });

  return (
    <div>
      <div data-testid="loading">{loading ? 'true' : 'false'}</div>
      <div data-testid="streaming">{streaming ? 'true' : 'false'}</div>
      <div data-testid="data">{data ? JSON.stringify(data) : 'null'}</div>
      <div data-testid="finalData">
        {finalData ? JSON.stringify(finalData) : 'null'}
      </div>
      <div data-testid="error">{error ? error.message : 'null'}</div>
      <button data-testid="execute" onClick={() => execute({ x: input })}>
        Execute
      </button>
      <button data-testid="reset" onClick={reset}>
        Reset
      </button>
    </div>
  );
}

describe('useToolStream', () => {
  it('shows loading then streaming then final data', async () => {
    const t: Tool<{ x: number }, TestOutput> = tool({
      name: 'stream-test',
      input: z.object({ x: z.number() }),
    });

    t.client(({ x }) => ({ y: x * 2, label: 'done' }));
    t.stream(async ({ x }, { stream }) => {
      stream({ y: x * 2 });
      await delay(50);
      stream({ label: 'done' });
      await delay(50);
      return { y: x * 2, label: 'done' };
    });

    render(<StreamTestComponent tool={t} input={5} />);

    // Initially: not loading, not streaming
    expect(screen.getByTestId('loading').textContent).toBe('false');
    expect(screen.getByTestId('streaming').textContent).toBe('false');
    expect(screen.getByTestId('data').textContent).toBe('null');

    // Trigger execution
    await act(async () => {
      screen.getByTestId('execute').click();
    });

    // Wait for final data
    await waitFor(
      () => {
        expect(screen.getByTestId('finalData').textContent).not.toBe('null');
      },
      { timeout: 3000 }
    );

    // Final state
    expect(screen.getByTestId('loading').textContent).toBe('false');
    expect(screen.getByTestId('streaming').textContent).toBe('false');
    expect(screen.getByTestId('finalData').textContent).toContain('"y":10');
  });

  it('handles errors during streaming', async () => {
    const t: Tool<{ x: number }, TestOutput> = tool({
      name: 'error-stream',
      input: z.object({ x: z.number() }),
    });

    t.stream(async ({ x }, { stream }) => {
      stream({ value: true });
      await delay(20);
      throw new Error('Stream error');
    });

    render(<StreamTestComponent tool={t} input={1} />);

    await act(async () => {
      screen.getByTestId('execute').click();
    });

    await waitFor(
      () => {
        expect(screen.getByTestId('error').textContent).toBe('Stream error');
      },
      { timeout: 3000 }
    );

    expect(screen.getByTestId('loading').textContent).toBe('false');
    expect(screen.getByTestId('streaming').textContent).toBe('false');
  });

  it('falls back to run() when no stream handler', async () => {
    const t: Tool<{ x: number }, TestOutput> = tool({
      name: 'no-stream',
      input: z.object({ x: z.number() }),
    });

    t.client(({ x }) => ({ y: x * 3 }));

    render(<StreamTestComponent tool={t} input={4} />);

    await act(async () => {
      screen.getByTestId('execute').click();
    });

    await waitFor(
      () => {
        expect(screen.getByTestId('finalData').textContent).not.toBe('null');
      },
      { timeout: 3000 }
    );

    expect(screen.getByTestId('finalData').textContent).toContain('"y":12');
  });

  it('resets state correctly', async () => {
    const t: Tool<{ x: number }, TestOutput> = tool({
      name: 'reset-test',
      input: z.object({ x: z.number() }),
    });

    t.client(({ x }) => ({ y: x }));
    t.stream(async ({ x }, { stream }) => {
      stream({ y: x });
      return { y: x };
    });

    render(<StreamTestComponent tool={t} input={7} />);

    // Execute first
    await act(async () => {
      screen.getByTestId('execute').click();
    });

    await waitFor(
      () => {
        expect(screen.getByTestId('finalData').textContent).not.toBe('null');
      },
      { timeout: 3000 }
    );

    // Reset
    await act(async () => {
      screen.getByTestId('reset').click();
    });

    expect(screen.getByTestId('data').textContent).toBe('null');
    expect(screen.getByTestId('finalData').textContent).toBe('null');
    expect(screen.getByTestId('loading').textContent).toBe('false');
    expect(screen.getByTestId('streaming').textContent).toBe('false');
    expect(screen.getByTestId('error').textContent).toBe('null');
  });

  it('calls onSuccess callback with final data', async () => {
    const t: Tool<{ x: number }, TestOutput> = tool({
      name: 'callback-test',
      input: z.object({ x: z.number() }),
    });

    t.client(({ x }) => ({ y: x * 2 }));
    t.stream(async ({ x }, { stream }) => {
      stream({ y: x });
      return { y: x * 2 };
    });

    const onFinalData = jest.fn();
    render(<StreamTestComponent tool={t} input={5} onFinalData={onFinalData} />);

    await act(async () => {
      screen.getByTestId('execute').click();
    });

    await waitFor(
      () => {
        expect(onFinalData).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    expect(onFinalData).toHaveBeenCalledWith({ y: 10 });
  });
});
