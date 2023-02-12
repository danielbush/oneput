import * as action from '../action';
import { Bindings } from '../binding';

export const defaultBindings: Bindings = [
  ['j', action.REC_NEXT],
  ['k', action.REC_PREV],
  ['ctrl+j', action.SIB_NEXT],
  ['ctrl+k', action.SIB_PREV],
  ['ctrl+cmd+u', action.UP],
  ['ctrl+alt+u', action.UP],
];
