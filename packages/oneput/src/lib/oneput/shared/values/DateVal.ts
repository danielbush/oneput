export class DateVal {
  static create(year: number, month: number, day: number) {
    return new DateVal(year, month, day);
  }

  static createFromUnixTime(unixTime: number) {
    const date = new Date(unixTime * 1000);
    return new DateVal(date.getFullYear(), date.getMonth() + 1, date.getDate());
  }

  year: number;
  month: number;
  jsmonth: number;
  day: number;

  constructor(year: number, month: number, day: number) {
    this.year = year;
    this.month = month;
    this.jsmonth = month - 1;
    this.day = day;
  }

  get dateString() {
    return new Date(this.year, this.month - 1, this.day).toLocaleString('default', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}
