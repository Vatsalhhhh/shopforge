/** Generic paginated response from the backend. */
export interface PagedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

/** Standard API error shape. */
export interface ApiError {
  detail: string | { msg: string; loc: string[] }[];
  status_code?: number;
}
