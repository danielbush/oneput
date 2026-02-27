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
    this.ctl.window.addEventListener('message', (evt: MessageEvent) => {
      if (evt.data?.type === 'test') {
        this.ctl.notify(evt.data.payload.message, { duration: 3000 });
      }
      if (evt.data?.type === 'insertImage') {
        const { dataUrl, fileName } = evt.data.payload;
        const doc = this.ctl.window.document;
        const img = doc.createElement('img');
        img.src = dataUrl;
        img.alt = fileName;
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.margin = '16px 0';
        doc.body.prepend(img);
        img.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }
}
