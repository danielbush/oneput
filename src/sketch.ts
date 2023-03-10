import { start } from '.';
import { tabify } from './load';

console.log('start coding here');
start(document.body);

class AppDrawer extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `<b class="app-drawer">I'm an app-drawer!</b>`;
    tabify(this);
  }
}
window.customElements.define('app-drawer', AppDrawer);

document.body.insertBefore(
  document.createElement('app-drawer'),
  document.body.firstChild,
);
document.body.insertBefore(
  document.createElement('app-drawer'),
  document.body.firstChild,
);
