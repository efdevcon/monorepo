import { IRepository } from './interfaces/IRepository'
import { model } from 'mongoose'

export abstract class BaseRepository<T> implements IRepository<T> {
  public _model: any

  constructor(modelName: string) {
    this._model = model(modelName)
  }

  public async create(item: T): Promise<T | undefined> {
    try {
      const result = await this._model.create(item)

      return result
    } catch (e) {
      console.log("Couldn't create item", item)
      console.error(e)
    }
  }

  public async find(conditions: object): Promise<Array<T>> {
    try {
      return await this._model.find(conditions).lean()
    } catch (e) {
      console.log("Couldn't find items", conditions)
      console.error(e)
    }

    return []
  }

  public async findAll(): Promise<Array<T>> {
    try {
      return await this._model.find({})
    } catch (e) {
      console.log("Couldn't find items")
      console.error(e)

      return []
    }
  }

  public async findOne(id: string): Promise<T | undefined> {
    try {
      return await this._model.findOne({ _id: id }).lean()
    } catch (e) {
      console.log("Couldn't find item", id)
      console.error(e)
    }
  }

  public async update(id: string, item: T): Promise<T | undefined> {
    try {
      const result = await this._model.findByIdAndUpdate(id, item, {
        new: true,
        lean: true,
      })

      return result
    } catch (e) {
      console.log("Couldn't update item", id)
      console.error(e)
    }
  }

  public async delete(id: string): Promise<boolean> {
    try {
      const result = await this._model.findByIdAndDelete(id)

      return result
    } catch (e) {
      console.log("Couldn't update item", id)
      console.error(e)

      return false
    }
  }

  public async deleteMany(conditions: object): Promise<boolean> {
    try {
      const result = await this._model.deleteMany(conditions)
      console.log('Deleted', result.deletedCount, 'items. Condition', conditions)

      return !!result
    } catch (e) {
      console.log("Couldn't update items", conditions)
      console.error(e)

      return false
    }
  }
}
