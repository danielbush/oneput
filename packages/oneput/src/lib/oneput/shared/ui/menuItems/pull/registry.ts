/**
 * Tracks which pull widget is mounted on which host node.
 *
 * Private to `pull/`. Menu rows are rebuilt often, and a rebuild reuses the
 * node: `FChild` keys on the host id, so `onMount` runs for the first build
 * only. A row built later therefore holds a widget that never mounted, and
 * asking it to paint does nothing.
 *
 * So a row does not paint its own widget. It paints whatever widget is on that
 * host id now, which is the one the user can see.
 *
 * Last mount wins. Two live menus that give the same host id to two widgets is
 * a bug in the caller (ids must be unique in the DOM anyway).
 */
type Painter = { paint: () => void };

const mounted = new Map<string, Painter>();

/**
 * Claim `hostId` for `painter`. The returned function releases the claim, and
 * only if a later mount has not already taken it.
 */
export function registerPainter(hostId: string, painter: Painter): () => void {
  mounted.set(hostId, painter);
  return () => {
    if (mounted.get(hostId) === painter) {
      mounted.delete(hostId);
    }
  };
}

/** Paint the widget currently on `hostId`. Does nothing if none is mounted. */
export function paintMounted(hostId: string): void {
  mounted.get(hostId)?.paint();
}
