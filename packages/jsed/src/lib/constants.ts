export const CURSOR_APPEND_CLASS = 'jsed-crs-append';
export const CURSOR_PREPEND_CLASS = 'jsed-crs-prepend';
export const CURSOR_INSERT_AFTER_CLASS = 'jsed-crs-insert-after';
export const CURSOR_INSERT_BEFORE_CLASS = 'jsed-crs-insert-before';

/**
 * CSS class for SIB_HIGHLIGHT.
 */
export const SBR_FOCUS_SIBLING = 'jsed-focus-sibling';
/**
 * Where the jsed app mounts and renders.  It should not be part of the document
 * that is being edited.
 */
export const JSED_APP_ROOT_ID = 'jsed-app-root';
/**
 * The focus CSS class for FOCUSABLE's (not TOKEN's).
 */
export const JSED_FOCUS_CLASS = 'jsed-focus';
/**
 * CSS class for tokens (text content that has been tokenized).
 */
export const JSED_TOKEN_CLASS = 'jsed-token';
/**
 * The focus CSS class for TOKEN's.
 */
export const JSED_CURSOR_CLASS = 'jsed-token-focus';
export const JSED_TOKEN_COLLAPSED = 'jsed-token-collapsed';
export const JSED_TOKEN_PADDED = 'jsed-token-padded';
/**
 * CSS class for ANCHOR .
 */
export const JSED_ANCHOR_CLASS = 'jsed-anchor-token';
export const JSED_ANCHOR_CHAR = '\u00A4';

/**
 * Elements with this class will not respond to FOCUS .
 */
export const JSED_IGNORE_CLASS = 'jsed-ignore';

/**
 * CSS class for IMPLICIT_LINE.
 */
export const JSED_IMPLICIT_CLASS = 'jsed-implicit-line';

/**
 * CSS class for SELECTION_WRAPPER — a styling-neutral inline span that
 * wraps a contiguous run of LINE_SIBLING's to paint the selection
 * background without disturbing inherited styling.
 */
export const JSED_SELECTION_CLASS = 'jsed-selection';

/**
 * CSS class for TRANSPARENT_BLOCK — a LINE (non-INLINE_FLOW, non-ISLAND FOCUSABLE) that the CURSOR
 * descends into (visit=no, descend=yes). By default such elements are OPAQUE_BLOCK;
 * this class opts them in to transparency.
 */
export const JSED_CURSOR_TRANSPARENT_CLASS = 'jsed-cursor-transparent';
