// Custom separate-chaining hash table: average O(1) lookup/insert.
export class HashTable<K, V> {
  private buckets: Array<Array<[K, V]>>;
  private count = 0;
  constructor(private capacity = 53) {
    this.buckets = Array.from({ length: capacity }, () => []);
  }
  private hash(key: K): number {
    const text = String(key);
    let h = 0;
    for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
    return h % this.capacity;
  }
  set(key: K, value: V): void {
    const bucket = this.buckets[this.hash(key)];
    const found = bucket.findIndex(([k]) => k === key);
    if (found >= 0) bucket[found][1] = value;
    else { bucket.push([key, value]); this.count++; }
  }
  get(key: K): V | undefined { return this.buckets[this.hash(key)].find(([k]) => k === key)?.[1]; }
  has(key: K): boolean { return this.buckets[this.hash(key)].some(([k]) => k === key); }
  get size(): number { return this.count; }
}
