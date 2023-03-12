import { start } from '.';
import { tabify } from './load';

console.log('start coding here');
const cx = start(document.body);

class AppDrawer extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `<b class="app-drawer">I'm an app-drawer!</b>`;
    tabify(cx, this);
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
