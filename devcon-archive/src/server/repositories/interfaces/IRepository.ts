export interface IRepository<T> {
  create(item: T): Promise<T | undefined>
  findAll(): Promise<Array<T>>
  findOne(id: string): Promise<T | undefined>
  update(id: string, item: T): Promise<boolean>
  delete(id: string): Promise<boolean>
}
