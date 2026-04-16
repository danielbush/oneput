export type { JsedFocusRequestEvent, JsedFocusEvent } from './types.js';
export { JsedDocument } from './JsedDocument.js';
export { EditManager, type EditManagerError, type EditManagerMode } from './EditManager.js';
export { Nav, type OnRequestFocus } from './Nav.js';
export { TokenCursorBase } from './TokenCursorBase.js';
export { TokenCursor } from './TokenCursor.js';
export { Tokenizer } from './Tokenizer.js';
export { quickDescend } from './lib/tokenize.js';
export { Detokenizer } from './lib/Detokenizer.js';

// TODO: hmm, should we just provide several entry points in package.json "exports"?
import * as token from './lib/token.js';
import { isToken, isAnchor } from './lib/taxonomy.js';
import { getLine } from './lib/sibwalk.js';
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
    getLine,
    isToken,
    isAnchor,
    addAnchors: token.addAnchors,
    getParent: token.getParent
  }
};

export {
  JSED_ANCHOR_CLASS,
  JSED_TOKEN_CLASS,
  JSED_APP_ROOT_ID,
  JSED_IGNORE_CLASS
} from './lib/constants.js';
export { utils };
