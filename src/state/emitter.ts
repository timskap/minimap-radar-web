// Minimal typed pub/sub used by the stores and managers so UI modules can
// re-render on change without a framework.
export class Emitter {
  private listeners = new Set<() => void>();

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(): void {
    for (const fn of this.listeners) fn();
  }
}
