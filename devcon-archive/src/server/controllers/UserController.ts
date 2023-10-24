import { Request, Response, NextFunction } from 'express'
import passport from 'passport'
import { UserAccount } from 'src/types/UserAccount'
import UserAccountModel from '../models/UserAccountModel'
import { IUserAccountRepository } from '../repositories/interfaces/IUserAccountRepository'

export class UserController {
  private _repository: IUserAccountRepository

  constructor(repository: IUserAccountRepository) {
    this._repository = repository
  }

  public async GetNonce(req: Request, res: Response) {
    try {
      const data = Math.floor(Math.random() * (999999 - 100000)) + 100000

      req.session.nonce = data
      res.status(200).send({ code: 200, message: 'OK', data: data })
    } catch (e) {
      console.error(e)
      res.status(500).send({ code: 500, message: 'Unable to generate security nonce.' })
    }
  }

  public async LoginWeb3(req: Request, res: Response, next: NextFunction) {
    passport.authenticate('web3', (error, user, info) => {
      if (error || !user) {
        res.status(400).send({ code: 400, message: info.message ?? `Bad request` })
      } else {
        req.logIn(user, function (err) {
          if (err) {
            return next(err)
          }
          return res.status(200).send({ code: 200, message: '', data: user })
        })
      }
    })(req, res, next)
  }

  public async LoginEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const email = req.body?.email
      const nonce = req.body?.nonce

      if (!email || !nonce) {
        return res.status(400).send({ code: 400, message: 'Email login input not provided.' })
      }

      if (email) {
        // TODO: & nonce
        let userAccount = await this._repository.findUserAccountByEmail(email)

        if (!userAccount) {
          const model = new UserAccountModel()
          model.email = email
          userAccount = await this._repository.create(model)
        }

        if (!userAccount) {
          return res.status(404).send({ code: 404, message: 'Unable to login by email.' })
        }

        req.logIn(userAccount, function (err) {
          if (err) {
            return next(err)
          }

          return res.status(200).send({ code: 200, message: '', data: userAccount })
        })
      }
    } catch (e) {
      console.error(e)
    }

    res.status(500).send({ code: 500, message: `Couldn't update profile` })
  }

  public async VerifyEmail(req: Request, res: Response) {
    res.status(200).send({ code: 200, message: '', data: 'Email verified' })
  }

  public async Logout(req: Request, res: Response) {
    try {
      req.logout()
      res.status(200).send({ code: 200, message: 'Logout successful' })
    } catch (e) {
      console.error(e)
      res.status(500).send({ code: 500, message: 'Unable to verify email.' })
    }
  }

  public async GetAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await this._repository.findOne(req.user._id)

      res.status(200).send({ code: 200, message: '', data: data })
    } catch (e) {
      console.error(e)
      res.status(500).send({ code: 500, message: 'Unable to get user account.' })
    }
  }

  public async UpdateAccount(req: Request, res: Response) {
    try {
      const paramId = req.params.id
      const userId = req.user._id
      const account = req.body?.account as UserAccount

      if (!account) {
        return res.status(400).send({ code: 400, message: 'User account not provided.' })
      }

      if (paramId !== userId) {
        return res.status(405).send({ code: 405, message: 'Not allowed to update user account.' })
      }

      if (paramId === userId) {
        const updated = await this._repository.update(paramId, account)
        if (updated) {
          return res.status(204).send({ code: 204, message: 'OK' })
        }

        return res.status(404).send({ code: 404, message: 'User account not updated.' })
      }
    } catch (e) {
      console.error(e)
    }

    res.status(500).send({ code: 500, message: 'Unable to update user account.' })
  }

  public async DeleteAccount(req: Request, res: Response) {
    try {
      const paramId = req.params.id
      const userId = req.user._id

      if (paramId !== userId) {
        return res.status(405).send({ code: 405, message: 'Not allowed to delete user account.' })
      }

      if (paramId === userId) {
        const deleted = await this._repository.delete(req.params.id)
        if (deleted) {
          req.logout()
          return res.status(200).send({ code: 200, message: 'OK' })
        }

        return res.status(404).send({ code: 404, message: 'User account not found.' })
      }
    } catch (e) {
      console.error(e)
    }

    res.status(500).send({ code: 500, message: 'Unable to delete user account.' })
  }
}
