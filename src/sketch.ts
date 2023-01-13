import { load } from './lib';

console.log('start coding here', load);
document.addEventListener('focusin', (evt) => {
  console.log(evt.relatedTarget, '->', evt.target);
});
load(document.body);
