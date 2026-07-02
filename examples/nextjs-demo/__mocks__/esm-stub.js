// Lightweight stub for ESM-only rendering deps (react-markdown, remark-gfm,
// shiki) that Jest cannot `require()` from the compiled library bundle. These
// packages are only exercised when a Markdown/CodeBlock *view* actually renders;
// the API-route and tool-logic tests never do, so a no-op stub is sufficient.
const noop = function () {
  return null;
};

module.exports = new Proxy(noop, {
  get: (_target, prop) => {
    if (prop === '__esModule') return true;
    if (prop === 'default') return noop;
    return noop;
  },
});
