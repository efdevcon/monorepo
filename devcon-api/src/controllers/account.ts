import { Request, Response, Router } from 'express'
import { API_INFO } from '@/utils/config'
import { PrismaClient } from '@/db/clients/account'
import { PrismaClient as ScheduleClient } from '@prisma/client'
import { AccountProfileData, UserAccount } from '@/types/accounts'
import { sendMail } from '@/services/email'
import { isValidSignature } from '@/utils/web3'
import { GetRecommendedSessions, GetRecommendedSpeakers } from '@/clients/recommendation'
import { RemapPretixRoles } from '@/clients/pretix'
import { decryptFile } from '@/utils/encrypt'
import { parseCSV } from '@/utils/files'
import { ValidateTicketPod } from '@/utils/zupass'
import { GenerateRandomUsername, GetEnsAddress, GetEnsAvatar, GetEnsName } from '@/utils/account'
import dayjs from 'dayjs'

const client = new PrismaClient()
const scheduleClient = new ScheduleClient()

export const accountRouter = Router()
accountRouter.get(`/account`, GetAccount)
accountRouter.get(`/account/:id/schedule`, GetAccountSchedule)
accountRouter.get(`/account/:id/poaps`, GetPoaps)
accountRouter.put(`/account/:id`, UpdateAccount)
accountRouter.put(`/account/zupass/import`, UpdateAccountImport)
accountRouter.delete(`/account/:id`, DeleteAccount)
accountRouter.post(`/account/token`, Token)
accountRouter.post(`/account/login/email`, LoginEmail)
accountRouter.post(`/account/login/token`, LoginToken)
accountRouter.post(`/account/login/web3`, LoginWeb3)
accountRouter.post(`/account/logout`, Logout)
accountRouter.get(`/account/speakers`, FollowedSpeakers)
accountRouter.get(`/account/speakers/recommended`, RecommendedSpeakers)
accountRouter.get(`/account/sessions`, FollowedSessions)
accountRouter.get(`/account/sessions/recommended`, RecommendedSessions)

async function GetAccount(req: Request, res: Response) {
  // #swagger.tags = ['Account']

  const userId = req.session.userId
  if (!userId) {
    // return as HTTP 200 OK
    return res.status(200).send({ code: 401, message: 'userId session not found.' })
  }

  const account = await client.account.findFirst({
    where: { id: userId },
    select: {
      ...Object.fromEntries(Object.keys(client.account.fields).map((key) => [key, true])),
      createdAt: false,
      updatedAt: false,
      disabled: false,
      appState_bogota: false,
    },
  })
  if (account) {
    return res.status(200).send({ code: 200, message: '', data: account })
  }

  res.status(500).send({ code: 500, message: 'Unable to get user account.' })
}

async function GetAccountSchedule(req: Request, res: Response) {
  // #swagger.tags = ['Account']

  let id = req.params.id
  let ensName = null
  let address = null
  if (id?.endsWith('.eth')) {
    ensName = id
    address = await GetEnsAddress(id)
  }
  if (id?.startsWith('0x')) {
    address = id
    ensName = await GetEnsName(id as `0x${string}`)
  }

  const account = await client.account.findFirst({
    where: {
      OR: [
        { id: { equals: id, mode: 'insensitive' } },
        { username: { equals: id, mode: 'insensitive' } },
        ensName ? { username: { equals: ensName, mode: 'insensitive' } } : {},
        { addresses: { hasSome: [id, id.toLowerCase(), id.toUpperCase()] } },
        address ? { addresses: { hasSome: [address, address.toLowerCase(), address.toUpperCase()] } } : {},
      ],
      publicSchedule: true,
    },
    select: {
      id: true,
      username: true,
      email: true,
      addresses: true,
      attending_sessions: true,
      interested_sessions: true,
    },
  })

  if (!account) {
    return res.status(404).send({ code: 404, message: 'User schedule not found. Make sure it is public.' })
  }

  const sessionIds = account.attending_sessions?.length > 0 ? account.attending_sessions : account.interested_sessions || []
  const schedule = await scheduleClient.session.findMany({
    where: {
      sourceId: { in: sessionIds },
    },
    include: {
      speakers: true,
      slot_room: true,
    },
    orderBy: {
      slot_start: 'asc',
    },
  })

  res.status(200).send({
    code: 200,
    message: '',
    user: {
      id: id,
      username: ensName ?? account.username ?? GenerateRandomUsername(account.id),
      avatar: await GetEnsAvatar(ensName ?? id),
    },
    data: schedule,
  })
}

async function GetPoaps(req: Request, res: Response) {
  // #swagger.tags = ['Account']

  let address = req.params.id
  if (!address) {
    return res.status(400).send({ code: 400, message: 'No address provided.' })
  }

  const eventIds = [
    3, // Devcon 1
    4, // Devcon 2
    5, // Devcon 3
    6, // Devcon 4
    69, // Devcon 5
    60695, // Devcon 6
    178416, // Devcon 7
    36029, // Devconnect AMS
    165263, // Devconnect IST
  ]

  try {
    const responses = await Promise.all(
      eventIds.map((eventId) =>
        fetch(`https://api.poap.tech/actions/scan/${address}/${eventId}`, {
          headers: { 'X-API-Key': process.env.POAP_API_KEY || '' },
        })
          .then(async (res) => {
            if (res.status === 200) {
              const data = await res.json()
              return {
                ...data,
                type: data?.event?.id === 36029 || data?.event?.id === 165263 ? 'devconnect' : 'devcon',
              }
            }

            return null
          })
          .catch((error) => {
            console.error(`Failed to fetch POAP for event ${eventId}:`, error)
            return null
          })
      )
    )

    const poaps = responses.filter(Boolean).flat()
    return res.status(200).send({ code: 200, message: '', data: poaps })
  } catch (error) {
    console.error('Failed to fetch POAPs:', error)
    return res.status(500).send({ code: 500, message: 'Failed to fetch POAPs' })
  }
}

async function UpdateAccountImport(req: Request, res: Response) {
  // #swagger.tags = ['Account']

  const userId = req.session.userId
  if (!userId) {
    // return as HTTP 200 OK
    return res.status(401).send({ message: 'userId session not found.' })
  }

  const pod = req.body?.pod
  if (!pod) {
    return res.status(400).send({ message: 'Ticket POD not provided.' })
  }

  const valid = ValidateTicketPod(pod)
  if (!valid) {
    return res.status(400).send({ message: 'Ticket POD is not valid.' })
  }

  const attendeeEmail = pod.entries.attendeeEmail
  if (!attendeeEmail) {
    return res.status(400).send({ message: 'Attendee email not found.' })
  }

  const profileData = await parseProfileData(attendeeEmail)
  if (!profileData) {
    return res.status(400).send({ message: 'Profile data not found.' })
  }

  const updated = await client.account.update({ where: { id: userId }, data: { ...profileData, updatedAt: new Date() } })
  return res.status(200).send({ code: 200, data: updated })
}

async function UpdateAccount(req: Request, res: Response) {
  // #swagger.tags = ['Account']

  const paramId = req.params.id as string
  const userId = req.session.userId
  const account = req.body?.account as UserAccount

  if (!userId) {
    // return as HTTP 200 OK
    return res.status(200).send({ code: 401, message: 'userId session not found.' })
  }

  if (!account) {
    return res.status(400).send({ code: 400, message: 'Account not provided.' })
  }

  if (paramId !== userId) {
    return res.status(403).send({ code: 403, message: 'not allowed to update account.' })
  }

  try {
    const updated = await client.account.update({ where: { id: paramId }, data: { ...account, updatedAt: new Date() } })
    if (updated) {
      return res.status(200).send({ code: 200, message: 'OK', data: account })
    }
  } catch (e) {
    console.error('Unable to update account', e)
    return res.status(404).send({ code: 404, message: 'User account not found.' })
  }
}

async function DeleteAccount(req: Request, res: Response) {
  // #swagger.tags = ['Account']

  const paramId = req.params.id as string
  const userId = req.session.userId

  if (!userId) {
    // return as HTTP 200 OK
    return res.status(200).send({ code: 401, message: 'userId session not found.' })
  }

  if (paramId !== userId) {
    return res.status(403).send({ code: 403, message: 'not allowed to update account.' })
  }

  try {
    const deleted = await client.account.delete({ where: { id: paramId } })
    if (deleted) {
      req.session.destroy((e) => console.debug('Session destroyed', e))
      return res.status(200).send({ code: 200, message: 'OK' })
    }
  } catch (e) {
    console.error('Unable to delete account', e)
    return res.status(404).send({ code: 404, message: 'User account not found.' })
  }
}

async function Token(req: any, res: Response) {
  // #swagger.tags = ['Account']
  // #swagger.parameters['body'] = { in: 'body', schema: { identifier: 'your@email.com' } }

  const identifier = req.body?.identifier as string
  const update = Boolean(req.body?.update)
  if (!identifier) {
    return res.status(400).send({ code: 400, message: 'Identifier not provided.' })
  }

  try {
    const isEmail = /\S+@\S+\.\S+/.test(identifier)
    const nonce = Math.floor(Math.random() * (99999999 - 10000000)) + 10000000

    let data = await client.verificationToken.create({
      data: {
        identifier: identifier,
        nonce: nonce,
        expires: dayjs(Date.now()).add(20, 'minutes').toDate(),
      },
    })

    if (!data) {
      return res.status(500).send({ code: 500, message: 'Unable to create verification token.' })
    }

    if (isEmail) {
      const cta = update ? 'Confirm email' : 'Login using magic link'
      const magiclink = update
        ? `${req.headers.origin || API_INFO.website}/account/email?token=${nonce}`
        : `${req.headers.origin || API_INFO.website}/login?token=${nonce}`

      await sendMail(identifier, 'email-cta', `${nonce} is your Devcon verification code`, {
        TITLE: 'Confirm your email address',
        DESCRIPTION: `Please enter this verification code on Devcon.org\n

      ${nonce}\n
       
      This verification codes expires in 20 minutes.`,
        CALL_TO_ACTION: cta,
        URL: magiclink,
      })

      data.nonce = -1 // only share nonce via email
    }

    req.session.tokenId = data?.id
    req.session.save()

    return res.status(200).send({ code: 200, message: '', data: data })
  } catch (e) {
    console.error(e)
    res.status(500).send({ code: 500, message: 'Unable to generate security nonce.' })
  }
}

async function LoginEmail(req: Request, res: Response) {
  // #swagger.tags = ['Account']

  const id = req.session.tokenId
  if (!id) {
    return res.status(400).send({ code: 400, message: 'No session token.' })
  }

  let address = req.body.address as string
  const nonce = Number(req.body.nonce)
  if (!address || !nonce || isNaN(nonce)) {
    return res.status(400).send({ code: 400, message: 'Invalid input.' })
  }

  address = address
  let data = await client.verificationToken.findFirst({
    where: { identifier: address, nonce: nonce, expires: { gt: new Date() } },
  })
  if (!data) {
    data = await client.verificationToken.findFirst({
      where: { id: id, nonce: nonce, expires: { gt: new Date() } },
    })

    if (!data) {
      return res.status(400).send({ code: 400, message: 'No valid verification token found.' })
    }
    address = data.identifier
  }

  const userId = req.session.userId
  // if a session exists => add email to existing account
  if (userId) {
    let userAccount = await client.account.findFirst({ where: { email: { equals: address, mode: 'insensitive' } } })
    if (userAccount) {
      return res.status(400).send({ code: 400, message: 'Unable to add email address.' }) // TODO: email address already exists
    }

    userAccount = await client.account.findFirst({ where: { id: userId } })
    if (!userAccount) {
      return res.status(400).send({ code: 400, message: 'Invalid session.' })
    }

    userAccount = { ...userAccount, email: address }
    if (!userAccount.onboarded) {
      const profile = await parseProfileData(address)
      if (profile) {
        userAccount = { ...userAccount, ...profile }
      }
    }
    const updated = await client.account.update({ where: { id: userId }, data: userAccount })
    if (updated) {
      // SUCCESS - No need to update session, userId remains the same
      return res.status(200).send({ code: 200, message: '', data: userAccount })
    }

    return res.status(500).send({ code: 500, message: 'Unable to add email address.' })
  }

  // else; create new user account based on email address
  let userAccount = await client.account.findFirst({ where: { email: { equals: address, mode: 'insensitive' } } })
  if (userAccount) {
    if (!userAccount.onboarded) {
      const profile = await parseProfileData(address)
      if (profile) {
        userAccount = await client.account.update({ where: { id: userAccount.id }, data: profile })
      }
    }

    req.session.userId = userAccount.id
    req.session.save()
    return res.status(200).send({ code: 200, message: '', data: userAccount })
  }

  if (!userAccount) {
    const profile = await parseProfileData(address)
    if (profile) {
      userAccount = await client.account.create({ data: { email: address, username: GenerateRandomUsername(address), ...profile } })
    } else {
      userAccount = await client.account.create({ data: { email: address, username: GenerateRandomUsername(address) } })
    }

    if (userAccount) {
      req.session.userId = userAccount.id
      req.session.save()

      return res.status(200).send({ code: 200, message: '', data: userAccount })
    }

    return res.status(500).send({ code: 500, message: 'Unable to create new user.' })
  }

  return res.status(500).send({ code: 500, message: 'Unable to login with email account.' })
}

async function LoginToken(req: Request, res: Response) {
  // #swagger.tags = ['Account']

  const id = req.session.tokenId as string
  if (!id) {
    return res.status(400).send({ code: 400, message: 'No session token.' })
  }

  const nonce: number = req.body.nonce
  if (!nonce) {
    return res.status(400).send({ code: 400, message: 'Invalid input.' })
  }

  const data = await client.verificationToken.findFirst({
    where: { id: id, nonce: nonce, expires: { gt: new Date() } },
  })
  if (!data) {
    return res.status(400).send({ code: 400, message: 'No valid verification token found.' })
  }

  const userId = req.session.userId
  const address = data.identifier
  // if a session exists => add email to existing account
  if (userId) {
    let userAccount = await client.account.findFirst({
      where: { email: address },
    })
    if (userAccount) {
      return res.status(400).send({ code: 400, message: 'Unable to add email address.' }) // TODO: email address already exists
    }

    userAccount = await client.account.findFirst({ where: { id: userId } })
    if (!userAccount) {
      return res.status(400).send({ code: 400, message: 'Invalid session.' })
    }

    userAccount = { ...userAccount, email: address }
    const updated = await client.account.update({ where: { id: userId }, data: userAccount })
    if (updated) {
      // SUCCESS - No need to update session, userId remains the same
      return res.status(200).send({ code: 200, message: '', data: userAccount })
    }

    return res.status(500).send({ code: 500, message: 'Unable to add email address.' })
  }

  // else; create new user account based on email address
  let userAccount = await client.account.findFirst({ where: { email: address } })
  if (userAccount) {
    req.session.userId = userAccount.id
    req.session.save()

    return res.status(200).send({ code: 200, message: '', data: userAccount })
  }

  if (!userAccount) {
    userAccount = await client.account.create({ data: { email: address, username: GenerateRandomUsername(address) } })

    if (userAccount) {
      req.session.userId = userAccount.id
      req.session.save()

      return res.status(200).send({ code: 200, message: '', data: userAccount })
    }

    return res.status(500).send({ code: 500, message: 'Unable to create new user.' })
  }

  return res.status(500).send({ code: 500, message: 'Unable to login with email account.' })
}

async function LoginWeb3(req: Request, res: Response) {
  // #swagger.tags = ['Account']

  const id = req.session.tokenId as string
  if (!id) {
    return res.status(400).send({ code: 400, message: 'No session token.' })
  }

  const address = req.body.address as `0x${string}`
  const nonce = Number(req.body.nonce)
  const msg = req.body.msg as string
  const signed = req.body.signed as `0x${string}`
  if (!address || !msg || !signed || !nonce || isNaN(nonce)) {
    return res.status(400).send({ code: 400, message: 'Invalid input.' })
  }

  const validSignature = await isValidSignature(address, msg, signed)
  if (!validSignature) {
    return res.status(400).send({ code: 400, message: 'Invalid signature.' })
  }

  const data = await client.verificationToken.findFirst({
    where: { identifier: address, nonce: nonce, expires: { gt: new Date() } },
  })
  if (!data) {
    return res.status(400).send({ code: 400, message: 'No valid verification token found.' })
  }

  const userId = req.session.userId
  // if a session exists => add address to existing account
  if (userId) {
    let userAccount = await client.account.findFirst({ where: { email: address } })
    if (userAccount) {
      return res.status(400).send({ code: 400, message: 'Unable to add wallet address.' }) // TODO: wallet address already exists
    }

    userAccount = await client.account.findFirst({ where: { id: userId } })
    if (!userAccount) {
      userAccount = await client.account.create({
        data: {
          username: (await GetEnsName(address as `0x${string}`)) ?? GenerateRandomUsername(address),
          addresses: [address],
          activeAddress: address,
        },
      })

      if (userAccount) {
        return res.status(200).send({ code: 200, message: '', data: userAccount })
      }

      return res.status(400).send({ code: 400, message: 'Unable to create user account.' })
    }

    userAccount = { ...userAccount, addresses: [...userAccount.addresses, address], activeAddress: address }
    const updated = await client.account.update({ where: { id: userId }, data: userAccount })
    if (updated) {
      // SUCCESS - No need to update session, userId remains the same
      return res.status(200).send({ code: 200, message: '', data: userAccount })
    }

    return res.status(500).send({ code: 500, message: 'Unable to login with Web3.' })
  }

  // else; start new session
  let userAccount = await client.account.findFirst({ where: { addresses: { has: address } } })
  if (userAccount) {
    req.session.userId = userAccount.id
    req.session.save()

    return res.status(200).send({ code: 200, message: '', data: userAccount })
  }

  userAccount = await client.account.create({
    data: {
      username: (await GetEnsName(address as `0x${string}`)) ?? GenerateRandomUsername(address),
      addresses: [address],
      activeAddress: address,
    },
  })
  if (userAccount) {
    req.session.userId = userAccount.id
    req.session.save()

    return res.status(200).send({ code: 200, message: '', data: userAccount })
  }

  return res.status(500).send({ code: 500, message: 'Unable to create new user.' })
}

async function Logout(req: Request, res: Response) {
  // #swagger.tags = ['Account']

  const session = req.session
  if (session) {
    session.destroy((e) => console.debug('Session destroyed', e))
    return res.status(200).send({ code: 200, message: '', data: false })
  }

  res.status(500).send({ status: 500, message: 'Unable to logout', data: false })
}

async function FollowedSpeakers(req: Request, res: Response) {
  // #swagger.tags = ['Account']

  const userId = req.session?.userId
  if (!userId) {
    // return as HTTP 200 OK
    return res.status(200).send({ code: 401, message: 'userId not found.' })
  }

  const account = await client.account.findFirst({
    where: { id: userId },
  })

  if (!account) {
    return res.status(400).send({ code: 400, message: 'No user account found.' })
  }

  const speakers = await scheduleClient.speaker.findMany({
    where: {
      OR: [{ id: { in: account.favorite_speakers } }, { sourceId: { in: account.favorite_speakers } }],
    },
  })

  return res.status(200).send({ code: 200, message: '', data: speakers })
}

async function RecommendedSpeakers(req: Request, res: Response) {
  // #swagger.tags = ['Account']

  const userId = req.session?.userId
  if (!userId) {
    // return as HTTP 200 OK
    return res.status(200).send({ code: 401, message: 'userId not found.' })
  }

  const account = await client.account.findFirst({
    where: { id: userId },
  })

  if (!account) {
    return res.status(400).send({ code: 400, message: 'No user account found.' })
  }

  if (account.addresses.length === 0) {
    return res.status(200).send({ code: 200, message: '', data: [] })
  }

  const speakers = (await Promise.all([...new Set(account.addresses)].map((i: string) => GetRecommendedSpeakers(i)))).flat()

  return res.status(200).send({ code: 200, message: '', data: speakers })
}

async function FollowedSessions(req: Request, res: Response) {
  // #swagger.tags = ['Account']

  const userId = req.session?.userId
  if (!userId) {
    // return as HTTP 200 OK
    return res.status(200).send({ code: 401, message: 'userId not found.' })
  }

  const account = await client.account.findFirst({
    where: { id: userId },
  })

  if (!account) {
    return res.status(400).send({ code: 400, message: 'No user account found.' })
  }

  // TODO: Include event filter?

  const interestedSessions = await scheduleClient.session.findMany({
    where: { sourceId: { in: account.interested_sessions } },
  })
  const attendingSessions = await scheduleClient.session.findMany({
    where: { sourceId: { in: account.attending_sessions } },
  })

  return res.status(200).send({
    code: 200,
    message: '',
    data: {
      interested: interestedSessions,
      attending: attendingSessions,
    },
  })
}

async function RecommendedSessions(req: Request, res: Response) {
  // #swagger.tags = ['Account']

  const userId = req.session?.userId
  if (!userId) {
    // return as HTTP 200 OK
    return res.status(200).send({ code: 401, message: 'userId not found.' })
  }

  const account = await client.account.findFirst({
    where: { id: userId },
  })

  if (!account) {
    return res.status(400).send({ code: 400, message: 'No user account found.' })
  }

  const sessions = await GetRecommendedSessions(account.id, true)

  return res.status(200).send({ code: 200, message: '', data: sessions })
}

async function parseProfileData(attendeeEmail: string) {
  const normalizedEmail = attendeeEmail.toLowerCase()
  const data = await decryptFile(`data/accounts/pretix.encrypted`)
  const results = await parseCSV(data)

  const account = results.find((row) => (Object.values(row)[0] as string)?.toLowerCase() === normalizedEmail)
  if (!account) {
    return undefined
  }

  const years = Object.entries(account)[1][1]
  const tracks = Object.entries(account)
    .filter(([track, interest]) => interest === 'Yes')
    .map(([track]) => track)
  const roles = RemapPretixRoles(Object.entries(account)[12][1] as string)
  const reason = Object.entries(account)[13][1] as string
  const profileData: AccountProfileData = {
    since: years === "I'm new to the space!" ? 2024 : 2024 - Number(years),
    roles: roles,
    tracks: tracks,
    reason: reason,
  }

  return profileData
}
