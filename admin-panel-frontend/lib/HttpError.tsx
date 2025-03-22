export default class HttpError extends Error {
  status: number;
  body: any;
  constructor(
    message: string,
    status: number = 0,
    body: Response = {} as Response
  ) {
    super(message);
    this.status = status;
    this.body = body;
  }
}
