import {
  JsedDocument,
  IJsedCursor,
  JsedFocusEvent,
  // JsedTokenFocusEvent,
} from './types';
import { start } from './app/start';
import * as token from './lib/token';

export {
  JSED_PLACEHOLDER_TOKEN_CLASS,
  JSED_TOKEN_CLASS,
  JSED_DOM_ROOT_ID,
} from './lib/constants';
const utils = {
  token: {
    getValue: token.getValue,
  },
};
export { start, utils };
export type {
  JsedDocument,
  JsedFocusEvent,
  // JsedTokenFocusEvent,
  IJsedCursor as JsedCursor,
};
