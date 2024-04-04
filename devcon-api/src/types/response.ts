export interface ApiResponse {
  status: number
  message: string
}

export interface ApiResponseData<T> extends ApiResponse {
  data?: T
}

export interface FetchedResult<T> {
  isLoading: boolean
  isError: boolean
  data: T
}

export interface PagedResult<T> {
  total: number
  currentPage: number
  items: Array<T>
}
