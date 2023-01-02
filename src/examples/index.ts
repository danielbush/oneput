import { load } from '../navigate/index';

console.log(window.document.body.firstChild);
const el = window.document.body.firstChild;
if (!el) {
  throw new Error('Cannot find first child');
}
load(el);
