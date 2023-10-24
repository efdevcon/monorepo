import { Request, Response, NextFunction } from 'express'
import Web3Strategy from 'passport-web3'
import UserAccountModel from '../models/UserAccountModel'
import { UserAccountRepository } from '../repositories/UserAccountRepository'

const onAuth = async (address: string, done: any) => {
  const repo = new UserAccountRepository()
  try {
    const userAccount = await repo.findUserAccountByAddress(address)

    if (userAccount) {
      done(null, userAccount)
    } else {
      const model = new UserAccountModel()
      model.addresses.push(address)

      const userAccount = await repo.create(model)

      if (userAccount) {
        done(null, userAccount)
      } else {
        done(null, false, { message: 'Could not authenticate user.' })
      }
    }
  } catch (e) {
    console.error(e)
    done(new Error('Unexpected error. Could not authenticate user.'))
  }
}

export const web3Strategy = new Web3Strategy(onAuth)

export const serializeUser = (user: any, done: any) => {
  done(null, user._id)
}

export const deserializeUser = async (user: any, done: any) => {
  const repo = new UserAccountRepository()
  const userAccount = await repo.findOne(user)

  done(null, userAccount)
}

export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    next()
  } else {
    res.status(401).send({ code: 401, message: `Not authorized.` })
  }
}
