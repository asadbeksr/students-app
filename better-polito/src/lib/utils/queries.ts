// Modified from polito/students-app — 2026-04-13

export class ApiError extends Error {
  constructor(
    public readonly error: string,
    public readonly code: number,
    public readonly responseCode?: number,
    public readonly serverResponse?: unknown,
    public cause?: Error,
  ) {
    super(error);
  }
}

export type SuccessResponse<T> = { data: T };

export const pluckData = <T>(response: SuccessResponse<T>) => {
  return response.data;
};

export const parseApiError = async (error: Error): Promise<ApiError | null> => {
  if (!(error instanceof ApiResponseError)) {
    return null;
  }
  const data = error.data as Record<string, unknown>;
  return new ApiError(
    (data?.message as string) || (data?.error as string) || 'Unknown error',
    (data?.code as number) ?? 0,
    error.status,
    data,
    error,
  );
};

export const rethrowApiError = async (error: Error): Promise<never> => {
  const pluckedError = await parseApiError(error);
  if (pluckedError) {
    throw pluckedError;
  }
  throw error;
};

export const ignoreNotFound = (e: Error): null => {
  if (e instanceof ApiResponseError && e.status === 404) return null;
  throw e;
};

// Web-compatible ResponseError
export class ApiResponseError extends Error {
  constructor(
    public readonly status: number,
    public readonly data: unknown,
  ) {
    super(`API Error ${status}`);
  }
}
