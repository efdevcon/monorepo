import { Request, Response } from 'express'

export class TwitterController {
  public async Test(req: Request, res: Response) {
    try {
      res.status(200).send({ code: 200, message: 'OK', data: 'Heartbeat' })
    } catch (e) {
      console.error(e)
      res.status(500).send({ code: 500, message: 'Yikes' })
    }
  }
}
