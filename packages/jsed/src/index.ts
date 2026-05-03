export type { JsedFocusRequestEvent, JsedFocusEvent } from './types.js';
export { JsedDocument } from './JsedDocument.js';
export { EditManager, type EditManagerError, type EditManagerMode } from './EditManager.js';
export { Nav, type OnRequestFocus } from './Nav.js';
export { Cursor } from './Cursor.js';
export { Tokenizer } from './Tokenizer.js';
export { Detokenizer } from './lib/Detokenizer.js';
export { tokenizeLineAt as tokenizeLine } from './lib/tokenize.js';

// TODO: hmm, should we just provide several entry points in package.json "exports"?
import * as token from './lib/token.js';
import { isToken, isAnchor } from './lib/taxonomy.js';
import { getLine } from './lib/line.js';
import * as dom from './lib/focusable.js';
import * as domRules from './lib/dom-rules.js';
const utils = {
  dom: {
    copyElement: dom.copyElement,
    replaceElement: dom.replaceElement,
    createElement: dom.createElement,
    insertAfter: dom.insertNewAfter,
    insertBefore: dom.insertNewBefore,
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
