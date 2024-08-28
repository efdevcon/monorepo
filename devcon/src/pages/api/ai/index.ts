import { NextApiRequest, NextApiResponse } from 'next'
import { api } from './open-ai'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log(req.method, 'method')
  console.log(req.query, 'query')
  console.log(req.body, 'body')
  //   const { threadID } = req.query

  return res.json('nice try')

  if (req.method === 'GET') {
    // const assistant = await api.createAssistant()

    // console.log(assistant, 'assistant')

    // return res.send(JSON.stringify(assistant))

    return res.send('hello from server')
  } else if (req.method === 'POST') {
    const { message, threadID } = JSON.parse(req.body)

    console.log(message, threadID, 'msg thread id')

    const result = await api.createMessage('asst_qRdY4uERLeF5QDaMtjNib1kt', message, threadID)

    return res.json(result)
  }

  return res.send('hello')
}
