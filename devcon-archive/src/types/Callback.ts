export interface Callback<T> {
  (error: Error | null, result?: T): void
}
