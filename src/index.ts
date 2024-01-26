import {
  JsedDocument,
  IJsedCursor,
  JsedFocusEvent,
  JsedTokenFocusEvent,
} from './app/document';
import { start } from './app/start';

export {
  JSED_PLACEHOLDER_TOKEN_CLASS,
  JSED_TOKEN_CLASS,
  JSED_DOM_ROOT_ID,
} from './lib/constants';
export { start };
export type {
  JsedDocument,
  JsedFocusEvent,
  JsedTokenFocusEvent,
  IJsedCursor as JsedCursor,
};
