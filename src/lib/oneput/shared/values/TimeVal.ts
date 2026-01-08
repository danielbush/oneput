export class TimeVal {
  static create(hour: number, minute: number) {
    return new TimeVal(hour, minute);
  }

  static createFromUnixTime(unixTime: number) {
    const date = new Date(unixTime * 1000);
    return new TimeVal(date.getHours(), date.getMinutes());
  }

  static createFromMinutes(minutes: number) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return new TimeVal(hour, minute);
  }

  static createFromSeconds(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const minute = minutes % 60;
    const hour = Math.floor(minutes / 60);
    return new TimeVal(hour, minute);
  }

  static createFromTimeString(timeString: string, sep: string | RegExp = ':') {
    const [hour, minute] = timeString.split(sep);
    return new TimeVal(parseInt(hour || '0'), parseInt(minute || '0'));
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

  get longTimeString() {
    const hours = this.hour.toString();
    const minutes = this.minute.toString();
    return `${hours}h ${minutes}m`;
  }

  get totalSeconds() {
    return this.hour * 3600 + this.minute * 60;
  }
}
