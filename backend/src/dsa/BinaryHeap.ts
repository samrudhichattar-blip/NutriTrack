// Custom min/max priority heap. push/pop are O(log n), peek is O(1).
export class BinaryHeap<T> {
  private data: T[] = [];
  constructor(private higherPriority: (a: T, b: T) => boolean) {}
  push(value: T): void {
    this.data.push(value);
    let i = this.data.length - 1;
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (!this.higherPriority(this.data[i], this.data[p])) break;
      [this.data[i], this.data[p]] = [this.data[p], this.data[i]];
      i = p;
    }
  }
  peek(): T | undefined { return this.data[0]; }
  pop(): T | undefined {
    if (!this.data.length) return undefined;
    const top = this.data[0], last = this.data.pop()!;
    if (this.data.length) {
      this.data[0] = last;
      let i = 0;
      while (true) {
        const l = i * 2 + 1, r = l + 1;
        let best = i;
        if (l < this.data.length && this.higherPriority(this.data[l], this.data[best])) best = l;
        if (r < this.data.length && this.higherPriority(this.data[r], this.data[best])) best = r;
        if (best === i) break;
        [this.data[i], this.data[best]] = [this.data[best], this.data[i]];
        i = best;
      }
    }
    return top;
  }
  get size(): number { return this.data.length; }
}
