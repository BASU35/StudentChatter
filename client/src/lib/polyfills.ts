// Browser environment polyfills for Node.js globals
import { Buffer as BufferPolyfill } from 'buffer';

if (typeof window !== 'undefined') {
  // Define global object for Node.js compatibility
  // @ts-ignore
  window.global = window;
  
  // Define process.env for packages that expect it
  // @ts-ignore
  window.process = window.process || { env: {} };
  
  // Define Buffer for packages that expect it
  // @ts-ignore
  window.Buffer = BufferPolyfill;
}