import type { IJsedCursor, JsedFocusRequestEvent, JsedFocusEvent } from './jsed/types.js';
import { JsedDocument } from './jsed/lib/JsedDocument.js';
import { JsedCursor } from './jsed/lib/JsedCursor.js';
import * as token from './jsed/lib/token.js';
import * as dom from './jsed/lib/dom.js';
import * as domRules from './jsed/lib/dom-rules.js';

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
} from './jsed/lib/constants.js';
export { utils };
export { JsedDocument, JsedCursor };
export type { JsedFocusRequestEvent, JsedFocusEvent, IJsedCursor };

export { CursorMarkers } from './oneput/CursorMarkers.js';
