import type { JsedCursor } from '$lib/jsed/index.js';

export function calcInputChange({ value, cursor }: { value: string; cursor: JsedCursor }) {
  cursor.replace(value);
}
