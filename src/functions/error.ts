export class error extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'M3U8Error';
  }
}
