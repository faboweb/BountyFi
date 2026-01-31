import './src/utils/polyfills';

import { Buffer } from 'buffer';
if (typeof global.Buffer === 'undefined') {
    global.Buffer = (Buffer as any);
}

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
