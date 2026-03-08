export type { ITokenCursor, JsedFocusRequestEvent, JsedFocusEvent } from './types.js';
export { JsedDocument } from './JsedDocument.js';
export { EditManager, type JsedInputSelectionState } from './EditManager.js';
export { Nav } from './Nav.js';
export { TokenCursor } from './TokenCursor.js';
export { CursorMarkers } from './CursorMarkers.js';

// TODO: hmm, should we just provide several entry points in package.json "exports"?
import * as token from './lib/token.js';
import * as dom from './lib/dom.js';
import * as domRules from './lib/dom-rules.js';
const utils = {
  dom: {
    copyElement: dom.copyElement,
    replaceElement: dom.replaceElement,
    createElement: dom.createElement,
    insertAfter: dom.insertAfter,
    insertBefore: dom.insertBefore,
    deleteElement: dom.deleteElement,
    splitParentBefore: dom.splitParentBefore,
    rules: domRules
  },
  token: {
    getValue: token.getValue,
    getLine: token.getLine,
    isToken: token.isToken,
    isAnchor: token.isAnchor,
    addAnchors: token.addAnchors,
    getFirstToken: token.getFirstToken,
    getParent: token.getParent,
    collapse: token.collapse,
    uncollapse: token.uncollapse,
    isCollapsed: token.isCollapsed
  }
};

export {
  JSED_ANCHOR_CLASS,
  JSED_TOKEN_CLASS,
  JSED_DOM_ROOT_ID,
  JSED_IGNORE_CLASS
} from './lib/constants.js';
export { utils };
