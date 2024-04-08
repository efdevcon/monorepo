import { Request, Response, NextFunction } from 'express'

export const notFoundHandler = (request: Request, response: Response, next: NextFunction) => {
  console.log('[404]', request.path, 'not found')

  response.status(404).send({
    status: 404,
    message: 'Not Found',
  })
}
