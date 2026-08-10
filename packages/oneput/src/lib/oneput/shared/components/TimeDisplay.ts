/**
 * Used to demo updating the DOM inside Oneput.
 */
export class TimeDisplay {
  static onMount = (node: HTMLElement) => {
    const td = new TimeDisplay(node);
    return () => {
      td.destroy();
    };
  };
  private tid: ReturnType<typeof setInterval>;
  constructor(private node: HTMLElement) {
    this.updateTime();
    this.tid = setInterval(this.updateTime, 1000);
  }
  private updateTime = () => {
    const now = new Date();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const hour24 = now.getHours();
    const meridiem = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 || 12;
    this.node.innerText = `${hour12}:${minutes}:${seconds} ${meridiem}`;
  };
  destroy = () => {
    clearInterval(this.tid);
  };
}
