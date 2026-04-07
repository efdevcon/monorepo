import { Request, Response, Router } from 'express'
import fs from 'fs'
import { join } from 'path'
import { SignJWT, jwtVerify } from 'jose'
import { parseCSV } from '@/utils/files'
import { sendMail } from '@/services/email'
import { CONFIG, SERVER_CONFIG } from '@/utils/config'

export const whitelistRouter = Router()

whitelistRouter.post('/whitelist/send-form-link', sendFormLink)
whitelistRouter.get('/whitelist/verify', verifyToken)

async function sendFormLink(req: Request, res: Response) {
  // #swagger.ignore = true
  const { email } = req.body

  if (!email || typeof email !== 'string') {
    return res.status(400).send({ status: 400, message: 'Email is required' })
  }

  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) {
    return res.status(400).send({ status: 400, message: 'Invalid email format' })
  }

  try {
    const csvPath = join(CONFIG.DATA_FOLDER, 'whitelisted-domains.csv')
    const csvData = fs.readFileSync(csvPath, 'utf-8')
    const rows = await parseCSV(csvData)
    const whitelistedDomains = rows.map((row: any) => row.domain?.toLowerCase().trim())

    const isWhitelisted = whitelistedDomains.includes(domain)

    if (!isWhitelisted) {
      // Not whitelisted — return the form URL directly (no token), they can still apply
      const formUrl = SERVER_CONFIG.WHITELIST_FORM_URL
      return res.status(200).send({ status: 200, message: 'Form link ready', data: { formUrl, whitelisted: false } })
    }

    // Whitelisted — sign a JWT and email the form link with the token pre-filled
    const secret = new TextEncoder().encode(SERVER_CONFIG.WHITELIST_JWT_SECRET)
    const token = await new SignJWT({ email, domain })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .setIssuedAt()
      .sign(secret)

    const formUrl = `${SERVER_CONFIG.WHITELIST_FORM_URL}?usp=pp_url&${SERVER_CONFIG.WHITELIST_FORM_TOKEN_FIELD}=${token}`

    if (SERVER_CONFIG.NODE_ENV === 'development') {
      // Dev mode — skip email, return the form URL directly
      return res.status(200).send({ status: 200, message: 'Form link ready (dev mode)', data: { formUrl, whitelisted: true } })
    }

    await sendMail(email, 'email-cta', 'Your Devcon Form Link', {
      TITLE: 'Your Devcon Form Link',
      DESCRIPTION: 'Click the button below to access the form.',
      CALL_TO_ACTION: 'Open Form',
      URL: formUrl,
    })

    return res.status(200).send({ status: 200, message: 'Form link sent', data: { whitelisted: true } })
  } catch (error) {
    console.error('Error in send-form-link:', error)
    return res.status(500).send({ status: 500, message: 'Internal server error' })
  }
}

async function verifyToken(req: Request, res: Response) {
  // #swagger.ignore = true
  const { token } = req.query

  if (!token || typeof token !== 'string') {
    return res.status(400).send({ status: 400, data: { whitelisted: false }, message: 'Token is required' })
  }

  try {
    const secret = new TextEncoder().encode(SERVER_CONFIG.WHITELIST_JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)

    return res.status(200).send({
      status: 200,
      data: {
        whitelisted: true,
        email: payload.email,
        domain: payload.domain,
      },
    })
  } catch (error) {
    return res.status(401).send({ status: 401, data: { whitelisted: false }, message: 'Invalid or expired token' })
  }
}
