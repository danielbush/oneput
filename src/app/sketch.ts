import { start } from '..';
import { tabrec } from '../lib/load';

console.log('start coding here');
const cx = start(document.body);

class AppDrawer extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `<b class="app-drawer">I'm an app-drawer!</b>`;
    tabrec(cx.TABS, this);
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
