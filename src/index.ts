import { JsedDocument, IJsedCursor, JsedFocusEvent } from './types';
import { start } from './app/start';
import * as token from './lib/token';
import * as dom from './lib/dom';

const utils = {
  dom: {
    copyElement: dom.copyElement,
    replaceElement: dom.replaceElement,
    createElement: dom.createElement,
    insertAfter: dom.insertAfter,
    insertBefore: dom.insertBefore,
    deleteElement: dom.deleteElement,
  },
  token: {
    getValue: token.getValue,
    getLine: token.getLine,
    isToken: token.isToken,
    getFirstToken: token.getFirstToken,
    getParent: token.getParent,
  },
};

export {
  JSED_PLACEHOLDER_TOKEN_CLASS,
  JSED_TOKEN_CLASS,
  JSED_DOM_ROOT_ID,
  JSED_IGNORE_CLASS,
} from './lib/constants';
export { start, utils };
export type { JsedDocument, JsedFocusEvent, IJsedCursor as JsedCursor };
