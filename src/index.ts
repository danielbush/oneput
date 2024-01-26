import {
  DocumentContext,
  IJsedCursor,
  JsedFocusEvent,
  JsedTokenFocusEvent,
} from './app/DocumentContext';
import { start } from './app/document';

export {
  JSED_PLACEHOLDER_TOKEN_CLASS,
  JSED_TOKEN_CLASS,
  JSED_DOM_ROOT_ID,
} from './lib/constants';
export { start };
export type {
  DocumentContext,
  JsedFocusEvent,
  JsedTokenFocusEvent,
  IJsedCursor as JsedCursor,
};
