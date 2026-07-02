// Polyfill Web platform globals that the `ai` SDK expects at import time but
// that Jest's sandboxed environment does not expose by default.
const { TextEncoder, TextDecoder } = require('node:util');
const {
  TransformStream,
  ReadableStream,
  WritableStream,
} = require('node:stream/web');
const { MessageChannel, MessagePort } = require('node:worker_threads');

Object.assign(globalThis, {
  TextEncoder,
  TextDecoder,
  TransformStream,
  ReadableStream,
  WritableStream,
  MessageChannel,
  MessagePort,
});
