// Decouples pages from the pager: pages call setPage(); main.ts registers the
// real navigator once the pager exists.
let navigator: ((index: number) => void) | null = null;

export function registerNavigator(fn: (index: number) => void): void {
  navigator = fn;
}

export function setPage(index: number): void {
  navigator?.(index);
}
