import { fetchSessions } from 'services/event-data'
import { UserAccount, UserSchedule } from 'types/UserAccount'
import { getRandomUsername, getUsername } from 'utils/account'
import dbConnect from 'utils/dbConnect'
import { isEmail } from 'utils/validators'
import { getDefaultProvider } from 'utils/web3'
import { BaseRepository } from './BaseRepository'
import { IUserAccountRepository } from './interfaces/IUserAccountRepository'

require('server/models/UserAccountModel')

export class UserAccountRepository extends BaseRepository<UserAccount> implements IUserAccountRepository {
  constructor() {
    super('UserAccount')
  }

  public async findUserAccountByEmail(email: string): Promise<UserAccount | undefined> {
    try {
      return await this._model.findOne({ email: {$regex: email, $options: 'i'} })
    } catch (e) {
      console.log("Couldn't find user account by email", email)
      console.error(e)
    }
  }

  public async findUserAccountByAddress(address: string): Promise<UserAccount | undefined> {
    try {
      return await this._model.findOne({ addresses:  {$regex: address, $options: 'i'} })
    } catch (e) {
      console.log("Couldn't find user account by address", address)
      console.error(e)
    }
  }

  public async findPersonalizedAgenda(userId: string): Promise<UserSchedule | undefined> {
    console.log('Find personalized schedule', userId)

    await dbConnect()

    try {
      const user = await this._model.findOne({ _id: userId }) as UserAccount
      if (!user) return

      const sessions = await fetchSessions()
      // username above all
      if (user.username) {
        return {
          userId: String(user._id),
          username: user.username,
          publicSchedule: user.appState.publicSchedule,
          sessions: sessions.filter(i => user.appState.sessions.map(x => x.id).includes(i.id))
        }
      }

      // check if ENS exists
      const username = getUsername(user)
      let name = getRandomUsername(String(user._id))
      
      if (!isEmail(username)) {
        try {
          const provider = getDefaultProvider()
          const ens = await provider.lookupAddress(username)
          if (ens) name = ens
        }
        catch (e) {
          console.log('ENS not found for', username)
        }
      }

      return {
        userId: String(user._id),
        username: name,
        publicSchedule: user.appState.publicSchedule,
        sessions: sessions.filter(i => user.appState.sessions.map(x => x.id).includes(i.id))
      }
    } catch (e) {
      console.log("Couldn't find user account", userId)
      console.error(e)
    }

    return
  }
}
