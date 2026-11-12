export class DOMUpdater {
  static create = () => {
    const status = new DOMUpdater();
    return status;
  };

  onMount = (node: HTMLElement) => {
    this.node = node;
    return () => {
      this.destroy();
    };
  };

  private node?: HTMLElement;

  constructor() {}

  withNode = (fn: (node: HTMLElement) => void) => {
    if (this.node) {
      fn(this.node);
    }
  };

  /** Replace status text without parsing HTML. */
  setText(text: string) {
    this.withNode((node) => {
      node.textContent = text;
    });
  }

  destroy = () => {
    this.node = undefined;
  };
}
