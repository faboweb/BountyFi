import 'react-native-get-random-values';
import 'fast-text-encoding';
import { polyfillWebCrypto } from 'expo-standard-web-crypto';
// Explicitly use the react-native implementation of isomorphic-webcrypto
// which uses msrcrypto (JS-only) instead of peculiar/webcrypto (Node-only)
const cryptoPolyfill = require('isomorphic-webcrypto/src/react-native');

console.log('[index.ts] Initializing polyfills...');

const actualPolyfill = (cryptoPolyfill as any).default || cryptoPolyfill;

console.log('[index.ts] Polyfill resolution:', {
    hasSubtle: !!actualPolyfill.subtle,
    keys: Object.keys(actualPolyfill)
});

const g = global as any;
if (!g.crypto) {
    g.crypto = actualPolyfill;
}

if (!g.crypto.subtle) {
    console.log('[index.ts] Attaching subtle from resolved polyfill');
    try {
        Object.defineProperty(g.crypto, 'subtle', {
            value: actualPolyfill.subtle,
            writable: true,
            configurable: true,
            enumerable: true
        });
    } catch (e) {
        console.error('[index.ts] Failed to define subtle:', e);
        g.crypto = actualPolyfill;
    }
}

// 3. Ensure global, globalThis and window are synced
(global as any).crypto = g.crypto;
if (typeof globalThis !== 'undefined') (globalThis as any).crypto = g.crypto;
if (typeof g.window !== 'undefined') g.window.crypto = g.crypto;

console.log('[index.ts] Polyfills applied final check:', {
    hasCrypto: !!g.crypto,
    hasSubtle: !!(g.crypto && g.crypto.subtle),
    keys: g.crypto ? Object.keys(g.crypto) : []
});

// 4. Sniff all subtle methods to see what CDP is calling
if (g.crypto && g.crypto.subtle) {
    const methods = ['generateKey', 'importKey', 'exportKey', 'sign', 'verify', 'deriveKey', 'deriveBits', 'encrypt', 'decrypt', 'digest'];
    methods.forEach(method => {
        const original = g.crypto.subtle[method];
        if (typeof original === 'function') {
            g.crypto.subtle[method] = function () {
                const args = Array.from(arguments);

                // Normalization: Web Crypto uses 'SHA-256' (hyphen). Some libs (e.g. ethers) pass 'SHA256'.
                if (method === 'digest' && args[0] !== undefined) {
                    const raw = args[0];
                    const name = typeof raw === 'string' ? raw : (raw && (raw as any).name);
                    if (name === 'SHA256' || name === 'SHA-256') {
                        args[0] = { name: 'SHA-256' };
                    } else if (typeof raw === 'string') {
                        args[0] = { name: raw };
                    }
                }

                console.log(`[crypto.subtle.${method}] CALL:`, JSON.stringify(args, (key, value) => {
                    if (value instanceof ArrayBuffer || value instanceof Uint8Array || ArrayBuffer.isView(value)) {
                        return `[Buffer ${value.byteLength}]`;
                    }
                    return value;
                }, 2));

                return original.apply(this, args)
                    .then((result: any) => {
                        console.log(`[crypto.subtle.${method}] SUCCESS`);
                        return result;
                    })
                    .catch((err: any) => {
                        console.error(`[crypto.subtle.${method}] FAILED:`, err);
                        throw err;
                    });
            };
        }
    });
}

// Test the polyfill
if (g.crypto && g.crypto.subtle) {
    console.log('[index.ts] Testing crypto.subtle.generateKey...');

    // Also check if getRandomValues works
    try {
        const array = new Uint8Array(32);
        g.crypto.getRandomValues(array);
        console.log('[index.ts] Test getRandomValues SUCCESS:', array.slice(0, 5));
    } catch (e) {
        console.error('[index.ts] Test getRandomValues FAILED:', e);
    }

    // Check if it's msrcrypto and its secure status
    if ((g.crypto as any).ensureSecure) {
        console.log('[index.ts] crypto.ensureSecure exists, waiting...');
        (g.crypto as any).ensureSecure()
            .then((res: any) => console.log('[index.ts] crypto.ensureSecure SUCCESS:', res))
            .catch((err: any) => console.error('[index.ts] crypto.ensureSecure FAILED:', err));
    }

    g.crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
        .then((keyPair: any) => {
            console.log('[index.ts] Test generateKey SUCCESS');
            return g.crypto.subtle.exportKey('jwk', keyPair.publicKey);
        })
        .then((jwk: any) => console.log('[index.ts] Test exportKey SUCCESS:', jwk.kty))
        .catch((err: any) => console.error('[index.ts] Test crypto flow FAILED:', err));

    // Optional: verify digest works (SHA-256 is the standard name)
    g.crypto.subtle.digest({ name: 'SHA-256' }, new Uint8Array([1, 2, 3]))
        .then(() => console.log('[index.ts] Digest (SHA-256) OK'))
        .catch((e: any) => console.warn('[index.ts] Digest test:', e?.message));
}

import { Buffer } from 'buffer';
if (typeof global.Buffer === 'undefined') {
    global.Buffer = (Buffer as any);
}

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
