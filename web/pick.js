// Pointer helpers for the 3D view, kept free of Three.js so they can be unit-tested.

// hits: raycaster intersections, nearest first; userData = { kind: 'piece'|'cell'|'target', r, c }.
// The nearest piece wins (selecting another piece); otherwise a highlighted target wins even when a
// nearer column hides it (moving downhill towards the camera); otherwise the nearest cell.
export function pickCell(hits) {
  const tagged = hits.map((h) => h.object.userData).filter((u) => u.r !== undefined);
  const first = tagged[0];
  if (!first) return null;
  const u = first.kind === 'piece' ? first : tagged.find((x) => x.kind === 'target') || first;
  return [u.r, u.c];
}

// A click is a single pointer released within `slop` px of where it went down.
// Any moment with two pointers down (pinch zoom) cancels the click for that gesture.
export function createClickTracker(slop) {
  const downs = new Map();
  let multi = false;
  return {
    down(e) {
      downs.set(e.pointerId, [e.clientX, e.clientY]);
      if (downs.size > 1) multi = true;
    },
    up(e) {
      const start = downs.get(e.pointerId);
      downs.delete(e.pointerId);
      const click = !multi && !!start && Math.hypot(e.clientX - start[0], e.clientY - start[1]) <= slop;
      if (downs.size === 0) multi = false;
      return click;
    },
    cancel(e) { downs.delete(e.pointerId); if (downs.size === 0) multi = false; },
  };
}
