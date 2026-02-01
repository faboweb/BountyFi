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
        reload: () => { },
        replace: () => { },
    };
}

const polyfillModule = (path: string, mod: any) => {
    if (!mod) return;

    // 1. Check/Fix named export (for ESM-style imports)
    if (mod.setCustomSourceTransformer === undefined) {
        mod.setCustomSourceTransformer = (transformer: any) => {
            console.log(`[Polyfill] ${path}: setCustomSourceTransformer (named) called`);
        };
    }

    // 2. Check/Fix default export property
    const actual = mod.default || mod;
    if (actual && actual.setCustomSourceTransformer === undefined) {
        actual.setCustomSourceTransformer = (transformer: any) => {
            console.log(`[Polyfill] ${path}: setCustomSourceTransformer (default property) called`);
        };
    }
};

// Fix for "TypeError: 0, _resolveAssetSource.setCustomSourceTransformer is not a function"
// This occurs in newer React Native / Expo combinations when asset resolution isn't fully ready
// or when module resolution conflicts in pnpm monorepos lead to missing exports.
const runAssetPolyfill = () => {
    try {
        polyfillModule('react-native/Libraries/Image/resolveAssetSource', require('react-native/Libraries/Image/resolveAssetSource'));
    } catch (e) { /* ignore */ }

    try {
        polyfillModule('expo-asset/build/resolveAssetSource', require('expo-asset/build/resolveAssetSource'));
    } catch (e) { /* ignore */ }

    try {
        polyfillModule('expo-asset/src/resolveAssetSource', require('expo-asset/src/resolveAssetSource'));
    } catch (e) { /* ignore */ }
};

runAssetPolyfill();
