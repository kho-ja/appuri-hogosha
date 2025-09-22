export interface HttpErrorBodyLike {
  error?: string;
  message?: string;
  [key: string]: unknown;
}

export default class HttpError extends Error {
  status: number;
  body: HttpErrorBodyLike | Response;
  constructor(
    message: string,
    status: number = 0,
    body: HttpErrorBodyLike | Response = {} as Response
  ) {
    super(message);
    this.status = status;
    this.body = body;
  }
}
