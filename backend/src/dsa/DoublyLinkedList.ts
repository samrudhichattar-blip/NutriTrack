export interface BasketEntry { variantId: string; quantityG: number; }
class Node<T> { next: Node<T> | null = null; prev: Node<T> | null = null; constructor(public value: T) {} }

// Custom doubly linked list. Search is O(n); insertion/removal by known node is O(1).
export class DoublyLinkedList<T extends { variantId: string }> {
  private head: Node<T> | null = null;
  private tail: Node<T> | null = null;
  private length = 0;
  add(value: T): void {
    const node = new Node(value);
    if (!this.tail) this.head = this.tail = node;
    else { node.prev = this.tail; this.tail.next = node; this.tail = node; }
    this.length++;
  }
  find(variantId: string): T | undefined {
    let n = this.head;
    while (n) { if (n.value.variantId === variantId) return n.value; n = n.next; }
    return undefined;
  }
  remove(variantId: string): T | undefined {
    let n = this.head;
    while (n && n.value.variantId !== variantId) n = n.next;
    if (!n) return undefined;
    if (n.prev) n.prev.next = n.next; else this.head = n.next;
    if (n.next) n.next.prev = n.prev; else this.tail = n.prev;
    this.length--;
    return n.value;
  }
  toArray(): T[] { const out: T[] = []; let n = this.head; while (n) { out.push(n.value); n = n.next; } return out; }
  get size(): number { return this.length; }
}
