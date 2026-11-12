import { checkedElement } from '../lib/domSafety.js';
import type { Controller } from './controller.js';

export class NativeController {
  static create(ctl: Controller) {
    return new NativeController(ctl);
  }

  static createNull(ctl: Controller) {
    return new NativeController(ctl);
  }

  private started = false;

  constructor(private ctl: Controller) {}

  start() {
    if (this.started) return;
    this.started = true;
    window.addEventListener('message', (evt: MessageEvent) => {
      if (evt.data?.type === 'test') {
        this.ctl.notify(evt.data.payload.message, { duration: 3000 });
      }
      if (evt.data?.type === 'insertImage') {
        const { dataUrl, fileName } = evt.data.payload;
        const doc = window.document;
        const img = doc.createElement('img');
        const checked = checkedElement({
          tag: 'img',
          attr: { src: dataUrl, alt: fileName },
          style: { maxWidth: '100%', height: 'auto', margin: '16px 0' }
        });
        if (!checked.attr.src) return;
        for (const [name, value] of Object.entries(checked.attr))
          img.setAttribute(name, String(value));
        img.style.cssText = checked.style;
        doc.body.prepend(img);
        img.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }
}
