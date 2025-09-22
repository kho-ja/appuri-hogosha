export default interface Upload<T> {
  success: boolean;
  message: string;
  summary?: {
    total: number;
    processed: number;
    errors: number;
    inserted: number;
    updated: number;
    deleted: number;
  };
  updated: T[];
  deleted: T[];
  inserted: T[];
  errors: {
    row: T;
    errors: {
      [key in keyof T]: string;
    };
  }[];
  csvFile?: Buffer;
}
