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
		const hours = now.getHours().toString().padStart(2, '0');
		const minutes = now.getMinutes().toString().padStart(2, '0');
		const seconds = now.getSeconds().toString().padStart(2, '0');
		this.node.innerText = `${hours}:${minutes}:${seconds}`;
	};
	destroy = () => {
		clearInterval(this.tid);
	};
}
