import { SERVER_CONFIG } from '@/utils/config'
import { Request, Response, NextFunction } from 'express'

export function isAuthorized(req: Request): boolean {
  const apiKey = req.query.apiKey
  if (!apiKey || typeof apiKey !== 'string') {
    return false
  }

  return SERVER_CONFIG.API_KEYS.includes(apiKey)
}

export function apikeyHandler(req: Request, res: Response, next: NextFunction) {
  if (isAuthorized(req)) {
    next()
  } else {
    res.status(401).send({ status: 401, message: 'Unauthorized' })
  }
}
