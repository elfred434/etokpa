class LocalStorageMock {
  private store = new Map<string, string>();
  getItem(key: string) { return this.store.get(key) ?? null; }
  setItem(key: string, value: string) { this.store.set(key, String(value)); }
  removeItem(key: string) { this.store.delete(key); }
  clear() { this.store.clear(); }
}

Object.defineProperty(globalThis, 'localStorage', { value: new LocalStorageMock(), configurable: true });
Object.defineProperty(globalThis, 'sessionStorage', { value: new LocalStorageMock(), configurable: true });
