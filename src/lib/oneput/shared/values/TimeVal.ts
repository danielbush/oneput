export class TimeVal {
	static create(hour: number, minute: number) {
		return new TimeVal(hour, minute);
	}

	hour: number;
	minute: number;

	constructor(hour: number, minute: number) {
		this.hour = hour;
		this.minute = minute;
	}

	get timeString() {
		return `${this.hour.toString().padStart(2, '0')}:${this.minute.toString().padStart(2, '0')}`;
	}
}
