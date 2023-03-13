import * as action from '../lib/action';
import { DocumentContext } from '../lib/DocumentContext';

export type Binding = [string, (cx: DocumentContext) => void];
export const defaultBindings: Binding[] = [
  ['ctrl+j', action.REC_NEXT],
  ['ctrl+k', action.REC_PREV],
  ['j', action.SIB_NEXT],
  ['k', action.SIB_PREV],
  ['ctrl+cmd+u', action.UP],
  ['ctrl+alt+u', action.UP],
];
