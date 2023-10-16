import { Model } from 'mongoose';

export interface IRepository<T> {
  _model: Model<T>,
  create(item: T): Promise<T | undefined>
  find(conditions: object): Promise<Array<T>>
  findAll(): Promise<Array<T>>
  findOne(id: string): Promise<T | undefined>
  update(id: string, item: T): Promise<T | undefined>
  delete(id: string): Promise<boolean>
  deleteMany(conditions: object): Promise<boolean>
}
