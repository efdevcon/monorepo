export interface FetchedResult<T> {
  isLoading: boolean
  isError: boolean
  data: T
}
