// Use in `setupFiles` in jest.config.

// https://github.com/jsdom/whatwg-url/issues/209#issuecomment-1015559283
// Root cause: https://github.com/jsdom/whatwg-url/issues/209#issuecomment-1127508258
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
