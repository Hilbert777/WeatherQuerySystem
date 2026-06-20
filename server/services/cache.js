export class TimedCache {
  constructor(defaultTtl = 10 * 60 * 1000) {
    this.defaultTtl = defaultTtl;
    this.items = new Map();
  }

  get(key) {
    const item = this.items.get(key);

    if (!item) {
      return null;
    }

    if (Date.now() > item.expiresAt) {
      this.items.delete(key);
      return null;
    }

    return item.value;
  }

  set(key, value, ttl = this.defaultTtl) {
    this.items.set(key, {
      value,
      expiresAt: Date.now() + ttl
    });
  }

  delete(key) {
    this.items.delete(key);
  }

  clear() {
    this.items.clear();
  }
}

