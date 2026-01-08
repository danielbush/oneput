export class DateTimeVal {
  static createFromUnixTime(unixTime: number) {
    const date = new Date(unixTime * 1000);
    return new DateTimeVal(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate(),
      date.getHours(),
      date.getMinutes()
    );
  }

  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;

  constructor(year: number, month: number, day: number, hour: number, minute: number) {
    this.year = year;
    this.month = month;
    this.day = day;
    this.hour = hour;
    this.minute = minute;
  }

  get dateTimeString() {
    return new Date(this.year, this.month - 1, this.day, this.hour, this.minute).toLocaleString(
      'default',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      }
    );
  }
}
