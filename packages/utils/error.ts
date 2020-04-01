export class StockadeError extends Error {
  constructor(message: string | undefined = undefined, readonly cause: any = undefined) {
    super(message);
  }
}
