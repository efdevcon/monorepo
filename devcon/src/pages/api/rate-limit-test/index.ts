import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('hello from server rate limit test')

  return res.send('hello from server rate limit test')
}
