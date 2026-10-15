const guards = new Set<() => boolean>();
export function registerUnsaved(check: () => boolean) { guards.add(check); return () => { guards.delete(check); }; }
export function hasUnsavedWork() { return [...guards].some(check => check()); }
export function confirmLeave() {
  return !hasUnsavedWork() || window.confirm('You have unsaved note changes. Leave this page? A recovery copy may remain in this tab; signing out removes it.');
}
