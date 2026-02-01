import 'react-native-get-random-values';
import 'fast-text-encoding';

// Explicitly use the react-native implementation of isomorphic-webcrypto
// which uses msrcrypto (JS-only) instead of peculiar/webcrypto (Node-only)
const cryptoPolyfill = require('isomorphic-webcrypto/src/react-native');

const actualPolyfill = (cryptoPolyfill as any).default || cryptoPolyfill;
const g = global as any;

if (!g.crypto) {
    g.crypto = actualPolyfill;
}

if (!g.crypto.subtle) {
    try {
        Object.defineProperty(g.crypto, 'subtle', {
            value: actualPolyfill.subtle,
            writable: true,
            configurable: true,
            enumerable: true
        });
    } catch (e) {
        g.crypto = actualPolyfill;
    }
}

// Ensure global, globalThis and window are synced
(global as any).crypto = g.crypto;
if (typeof globalThis !== 'undefined') (globalThis as any).crypto = g.crypto;
if (typeof g.window !== 'undefined') g.window.crypto = g.crypto;

// Avoid "Cannot read property 'href' / 'search' of undefined" when code (e.g. CDP, navigation) reads location before runtime is ready
if (typeof g.window !== 'undefined' && !g.window.location) {
  (g.window as any).location = {
    href: '',
    search: '',
    pathname: '/',
    hash: '',
    host: '',
    hostname: '',
    origin: '',
    port: '',
    protocol: 'https:',
    reload: () => {},
    replace: () => {},
  };
}
