/**
 * Namespaced identifiers for jsed's editor actions.
 *
 * The `JSED__` prefix keeps these distinct from Oneput's core actions
 * (`ONEPUT__`) and from a consumer's own actions when their action maps are
 * merged. Reference these constants rather than raw strings so TypeScript
 * autocompletes them and catches typos at compile time.
 */
export const JsedAction = {
  DOWN: 'JSED__DOWN',
  UP: 'JSED__UP',
  ENTER: 'JSED__ENTER',
  RIGHT_ARROW: 'JSED__RIGHT_ARROW',
  LEFT_ARROW: 'JSED__LEFT_ARROW',
  EXTEND_RIGHT_ARROW: 'JSED__EXTEND_RIGHT_ARROW',
  EXTEND_LEFT_ARROW: 'JSED__EXTEND_LEFT_ARROW',
  EXIT: 'JSED__EXIT',
  DELETE: 'JSED__DELETE',
  FOCUS: 'JSED__FOCUS',
  TOGGLE_SELECT: 'JSED__TOGGLE_SELECT',
  NEXT: 'JSED__NEXT',
  PREVIOUS: 'JSED__PREVIOUS',
  UNDO: 'JSED__UNDO',
  REDO: 'JSED__REDO',
  EXTEND_NEXT: 'JSED__EXTEND_NEXT',
  EXTEND_PREVIOUS: 'JSED__EXTEND_PREVIOUS',
  REVEAL: 'JSED__REVEAL',
  CUT: 'JSED__CUT',
  COPY: 'JSED__COPY',
  COPY_EMPTY_PREVIOUS: 'JSED__COPY_EMPTY_PREVIOUS',
  COPY_EMPTY_NEXT: 'JSED__COPY_EMPTY_NEXT',
  PASTE_BEFORE: 'JSED__PASTE_BEFORE',
  PASTE_AFTER: 'JSED__PASTE_AFTER',
  PASTE_APPEND: 'JSED__PASTE_APPEND'
} as const;

export type JsedActionId = (typeof JsedAction)[keyof typeof JsedAction];
