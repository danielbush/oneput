/**
 * Namespaced identifiers for Oneput's core actions.
 *
 * The `ONEPUT__` prefix keeps these distinct from a consumer's own actions and
 * from other Oneput-based libraries (e.g. jsed uses `JSED__`) when their action
 * maps are mixed together. Reference these constants rather than raw strings so
 * TypeScript autocompletes them and catches typos at compile time.
 */
export const OneputAction = {
  EXIT: 'ONEPUT__EXIT',
  FOCUS_INPUT: 'ONEPUT__FOCUS_INPUT',
  OPEN_MENU: 'ONEPUT__OPEN_MENU',
  HIDE_ONEPUT: 'ONEPUT__HIDE_ONEPUT',
  DO_ACTION: 'ONEPUT__DO_ACTION',
  BACK: 'ONEPUT__BACK',
  CLOSE_MENU: 'ONEPUT__CLOSE_MENU',
  FOCUS_PREVIOUS_MENU_ITEM: 'ONEPUT__FOCUS_PREVIOUS_MENU_ITEM',
  FOCUS_NEXT_MENU_ITEM: 'ONEPUT__FOCUS_NEXT_MENU_ITEM',
  GLOBAL_FILTER: 'ONEPUT__GLOBAL_FILTER',
  FILL: 'ONEPUT__FILL',
  SUBMIT: 'ONEPUT__SUBMIT'
} as const;

export type OneputActionId = (typeof OneputAction)[keyof typeof OneputAction];
