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
  
  // Polyfill for EventEmitter
  // @ts-ignore
  if (!window.events) {
    // @ts-ignore
    window.events = {};
    // @ts-ignore
    window.events.EventEmitter = class EventEmitter {
      constructor() {
        this.events = {};
      }
      
      on(event, listener) {
        if (!this.events[event]) {
          this.events[event] = [];
        }
        this.events[event].push(listener);
        return this;
      }
      
      removeListener(event, listener) {
        if (!this.events[event]) return this;
        this.events[event] = this.events[event].filter(l => l !== listener);
        return this;
      }
      
      emit(event, ...args) {
        if (!this.events[event]) return false;
        this.events[event].forEach(listener => listener.apply(this, args));
        return true;
      }
      
      once(event, listener) {
        const onceWrapper = (...args) => {
          listener.apply(this, args);
          this.removeListener(event, onceWrapper);
        };
        this.on(event, onceWrapper);
        return this;
      }
    };
  }
  
  // Polyfill for util
  // @ts-ignore
  if (!window.util) {
    // @ts-ignore
    window.util = {
      debuglog: () => () => {},
      inspect: (obj) => JSON.stringify(obj)
    };
  }
}