type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  errors?: unknown[];
};

export type RequestFieldError = {
  field?: string;
  message: string;
};

export type ListMeta = {
  page: number;
  pageSize: number;
  total: number;
  pages: number;
};

export const AUTH_EXPIRED_EVENT = "bilal-rms:auth-expired";

export class RequestError extends Error {
  status: number;
  errors: RequestFieldError[];

  constructor(message: string, status: number, errors: RequestFieldError[] = []) {
    super(message);
    this.name = "RequestError";
    this.status = status;
    this.errors = errors;
  }
}

const normalizeFieldErrors = (errors: unknown): RequestFieldError[] => {
  if (!Array.isArray(errors)) {
    return [];
  }

  return errors
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const record = entry as Record<string, unknown>;
      const message = typeof record.message === "string" ? record.message : null;
      if (!message) {
        return null;
      }

      return {
        field: typeof record.field === "string" ? record.field : undefined,
        message,
      };
    })
    .filter((entry): entry is RequestFieldError => entry !== null);
};

export const getErrorMessage = (error: unknown, fallback = "Request failed") => {
  if (error instanceof RequestError) {
    return error.message || fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
};

const shouldEmitAuthExpired = (url: string, status: number) => {
  if (status !== 401) {
    return false;
  }

  return !url.startsWith("/auth/");
};

const request = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const isFormData = init?.body instanceof FormData;
  const method = (init?.method ?? "GET").toUpperCase();
  const response = await fetch(`/api/v1${url}`, {
    credentials: "include",
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(method === "GET" || method === "HEAD" ? {} : { "X-Requested-With": "XMLHttpRequest" }),
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok || !payload?.success) {
    if (typeof window !== "undefined" && shouldEmitAuthExpired(url, response.status)) {
      window.dispatchEvent(
        new CustomEvent(AUTH_EXPIRED_EVENT, {
          detail: {
            status: response.status,
            url,
            message: payload?.message ?? "Request failed",
          },
        }),
      );
    }

    throw new RequestError(
      payload?.message ?? "Request failed",
      response.status,
      normalizeFieldErrors(payload?.errors),
    );
  }

  return payload.data;
};

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: BodyInit | Record<string, unknown>) =>
    request<T>(url, {
      method: "POST",
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(url: string, body?: Record<string, unknown>) =>
    request<T>(url, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(url: string, body?: Record<string, unknown>) =>
    request<T>(url, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(url: string) =>
    request<T>(url, {
      method: "DELETE",
    }),
};

export const toQueryString = (params: Record<string, string | number | null | undefined>) => {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      return;
    }

    search.set(key, String(value));
  });

  const query = search.toString();
  return query ? `?${query}` : "";
};
