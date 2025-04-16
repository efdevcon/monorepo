export interface FilterParams {
  from?: number;
  size?: number;
  sort?: string;
  order?: string;
  q?: string;
}

export interface FilterResponse<T> {
  total: number;
  currentPage: number;
  items: T[];
}
