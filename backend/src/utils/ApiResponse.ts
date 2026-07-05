export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors: unknown[];
}

export class ApiResponse {
  static success<T>(message: string, data: T): ApiSuccessResponse<T> {
    return {
      success: true,
      message,
      data,
    };
  }

  static error(message: string, errors: unknown[] = []): ApiErrorResponse {
    return {
      success: false,
      message,
      errors,
    };
  }
}
