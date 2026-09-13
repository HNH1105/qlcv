export class GiaoBanXungDotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GiaoBanXungDotError";
  }
}