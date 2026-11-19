// LIFO stack for undo actions: push/pop/peek are O(1).
export class Stack<T> {
  private items: T[] = [];
  push(item: T): void { this.items.push(item); }
  pop(): T | undefined { return this.items.pop(); }
  peek(): T | undefined { return this.items[this.items.length - 1]; }
  get isEmpty(): boolean { return this.items.length === 0; }
  get size(): number { return this.items.length; }
}
