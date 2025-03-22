export default interface Upload<T> {
  message: string; // Type should be string, not a specific message
  updated: T[];
  deleted: T[];
  inserted: T[];
  errors: {
    row: T;
    errors: {
      [key in keyof T]: string;
    };
  }[];
  csvFile: Buffer;
}
