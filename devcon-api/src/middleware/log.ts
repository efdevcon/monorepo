import { Request, Response, NextFunction } from 'express'

const excludePaths = ['/docs', '/static']

export const logHandler = (request: Request, response: Response, next: NextFunction) => {
  if (!excludePaths.some((path) => request.path.startsWith(path))) {
    console.log(`[${request.method}] ${request.path}`)
  }

  next()
}
