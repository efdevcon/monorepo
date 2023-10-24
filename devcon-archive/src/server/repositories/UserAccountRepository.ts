import { UserAccount } from 'src/types/UserAccount'
import { BaseRepository } from './BaseRepository'
import { IUserAccountRepository } from './interfaces/IUserAccountRepository'

export class UserAccountRepository extends BaseRepository<UserAccount> implements IUserAccountRepository {
  constructor() {
    super('UserAccount')
  }

  public async findUserAccountByEmail(email: string): Promise<UserAccount | undefined> {
    try {
      return await this._model.findOne({ email: email })
    } catch (e) {
      console.log("Couldn't find user account by email", email)
      console.error(e)
    }
  }

  public async findUserAccountByAddress(address: string): Promise<UserAccount | undefined> {
    try {
      return await this._model.findOne({ addresses: address })
    } catch (e) {
      console.log("Couldn't find user account by address", address)
      console.error(e)
    }
  }
}
