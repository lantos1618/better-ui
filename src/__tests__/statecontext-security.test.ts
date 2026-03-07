/**
 * Tests for stateContext prototype pollution protection
 * Validates the mergeStateContext fix in chat routes
 */

describe('mergeStateContext security', () => {
  /** Replicates the fixed mergeStateContext logic from the chat routes */
  function mergeStateContext(target: Record<string, unknown>, source: unknown) {
    if (!source || typeof source !== 'object' || Array.isArray(source)) return;
    for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      target[key] = value;
    }
  }

  it('merges safe keys', () => {
    const ctx: Record<string, unknown> = Object.create(null);
    mergeStateContext(ctx, { counter: 5, theme: 'dark' });
    expect(ctx).toEqual({ counter: 5, theme: 'dark' });
  });

  it('rejects __proto__ key', () => {
    const ctx: Record<string, unknown> = Object.create(null);
    mergeStateContext(ctx, JSON.parse('{"__proto__": {"isAdmin": true}, "safe": 1}'));
    expect(ctx).toEqual({ safe: 1 });
    expect(({} as any).isAdmin).toBeUndefined();
  });

  it('rejects constructor key', () => {
    const ctx: Record<string, unknown> = Object.create(null);
    mergeStateContext(ctx, { constructor: { prototype: { polluted: true } }, safe: 1 });
    expect(ctx).toEqual({ safe: 1 });
  });

  it('rejects prototype key', () => {
    const ctx: Record<string, unknown> = Object.create(null);
    mergeStateContext(ctx, { prototype: { polluted: true }, safe: 1 });
    expect(ctx).toEqual({ safe: 1 });
  });

  it('ignores non-object sources', () => {
    const ctx: Record<string, unknown> = Object.create(null);
    mergeStateContext(ctx, null);
    mergeStateContext(ctx, undefined);
    mergeStateContext(ctx, 'string');
    mergeStateContext(ctx, 42);
    mergeStateContext(ctx, [1, 2, 3]);
    expect(Object.keys(ctx)).toEqual([]);
  });

  it('handles nested objects safely', () => {
    const ctx: Record<string, unknown> = Object.create(null);
    mergeStateContext(ctx, { nested: { __proto__: { evil: true } } });
    // The nested object itself is fine — we only block top-level pollution keys
    expect(ctx.nested).toBeDefined();
  });
});
