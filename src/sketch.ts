import { load } from './lib';

console.log('start coding here');
// document.addEventListener('focusin', (evt) => {
//   console.log(evt.relatedTarget, '->', evt.target);
// });
load(document.body);

class AppDrawer extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `<b class="app-drawer">I'm an app-drawer!</b>`;
  }
}
window.customElements.define('app-drawer', AppDrawer);

document.body.insertBefore(
  document.createElement('app-drawer'),
  document.body.firstChild,
);
