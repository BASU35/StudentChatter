// Simple EventEmitter polyfill for browser
export class EventEmitter {
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
}

export default { EventEmitter };