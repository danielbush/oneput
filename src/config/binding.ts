import * as action from '../action';
import { Bindings } from '../binding';

export const defaultBindings: Bindings = [
  ['ctrl+j', action.REC_NEXT],
  ['ctrl+k', action.REC_PREV],
  ['j', action.SIB_NEXT],
  ['k', action.SIB_PREV],
  ['ctrl+cmd+u', action.UP],
  ['ctrl+alt+u', action.UP],
];
