// Wrap a navigation in the View Transitions API so the browser does the
// crossfade/blur transition declared in index.css. Falls back to a plain
// callback when the API is unavailable (Safari / older browsers).
type DocWithVT = Document & {
  startViewTransition?: (cb: () => void) => unknown;
};

export function withViewTransition(callback: () => void) {
  const doc = document as DocWithVT;
  if (typeof doc.startViewTransition === "function") {
    doc.startViewTransition(callback);
  } else {
    callback();
  }
}
