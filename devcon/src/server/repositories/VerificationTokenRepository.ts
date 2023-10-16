import { VerificationToken } from '../../types/VerificationToken'
import { BaseRepository } from './BaseRepository'
import { IVerificationTokenRepository } from './interfaces/IVerificationTokenRepository'

require('../models/VerificationTokenModel')

export class VerificationTokenRepository extends BaseRepository<VerificationToken> implements IVerificationTokenRepository {
  constructor() {
    super('VerificationToken')
  }

  public async findValidVerificationToken(identifier: string, nonce: number): Promise<VerificationToken | undefined> {
    try {
      return await this._model.findOne({
        identifier: identifier,
        nonce: nonce,
        expires: { $gt: new Date() }
      })
    } catch (e) {
      console.log("Couldn't find verification token", identifier, nonce)
      console.error(e)
    }
  }
}
