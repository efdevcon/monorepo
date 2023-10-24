import { UserAccount } from 'src/types/UserAccount'
import { IRepository } from './IRepository'

export interface IUserAccountRepository extends IRepository<UserAccount> {
  findUserAccountByEmail(email: string): Promise<UserAccount | undefined>
  findUserAccountByAddress(address: string): Promise<UserAccount | undefined>
}
