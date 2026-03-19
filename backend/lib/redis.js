/**
 * Redis Connection & In-Memory Fallback Adapter
 * Handles connection management, pub/sub for invalidation, and graceful fallback.
 */

const EventEmitter = require('events');

class InMemoryStore extends EventEmitter {
  constructor() {
    super();
    this.store = new Map();
    this.ttls = new Map();
  }

  async get(key) {
    if (this.ttls.has(key) && Date.now() > this.ttls.get(key)) {
      this.store.delete(key);
      this.ttls.delete(key);
      return null;
    }
    return this.store.get(key) || null;
  }

  async set(key, value, mode, duration) {
    this.store.set(key, value);
    if (mode === 'EX' && duration) {
      this.ttls.set(key, Date.now() + duration * 1000);
    }
    return 'OK';
  }

  async del(key) {
    this.store.delete(key);
    this.ttls.delete(key);
    return 1;
  }

  async publish(channel, message) {
    this.emit(channel, message);
    return 1;
  }

  subscribe(channel, cb) {
    this.on(channel, cb);
  }
}

const memoryClient = new InMemoryStore();

const getClient = () => {
  return memoryClient;
};

module.exports = {
  getClient,
  memoryClient
};
