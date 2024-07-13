import type {
  JsedDocument,
  IJsedCursor,
  JsedFocusRequestEvent,
  JsedFocusEvent,
} from './types';
import { start } from './app/start';
import * as token from './lib/token';
import * as dom from './lib/dom';
import * as domRules from './lib/dom-rules';

const utils = {
  dom: {
    copyElement: dom.copyElement,
    replaceElement: dom.replaceElement,
    createElement: dom.createElement,
    insertAfter: dom.insertAfter,
    insertBefore: dom.insertBefore,
    deleteElement: dom.deleteElement,
    rules: domRules,
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
    isCollapsed: token.isCollapsed,
  },
};

export {
  JSED_ANCHOR_CLASS,
  JSED_TOKEN_CLASS,
  JSED_DOM_ROOT_ID,
  JSED_IGNORE_CLASS,
} from './lib/constants';
export { start, utils };
export type {
  JsedDocument,
  JsedFocusRequestEvent,
  JsedFocusEvent,
  IJsedCursor as JsedCursor,
};
