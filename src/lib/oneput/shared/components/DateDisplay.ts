/**
 * Used to demo updating the DOM inside Oneput.
 */
export class DateDisplay {
  static onMount = (node: HTMLElement) => {
    const td = new DateDisplay(node);
    return () => {
      td.destroy();
    };
  };
  private tid: number;
  constructor(private node: HTMLElement) {
    this.updateTime();
    const now = new Date();
    const msUntilNextHour =
      (60 - now.getMinutes()) * 60 * 1000 - now.getSeconds() * 1000 - now.getMilliseconds();
    this.tid = window.setTimeout(() => {
      this.updateTime();
      this.tid = window.setInterval(this.updateTime, 60 * 60 * 1000); // every hour
    }, msUntilNextHour);
  }
  private updateTime = () => {
    const now = new Date();
    this.node.innerText = now.toDateString();
  };
  destroy = () => {
    clearInterval(this.tid);
  };
}
