import type { NextApiRequest, NextApiResponse } from 'next'
import { handleCopySave } from 'lib/components/use-copy/server/api-handler'

const basePath = process.env.COPY_CONTENT_PATH || './content'

export default (req: NextApiRequest, res: NextApiResponse) =>
  handleCopySave(req, res, { basePath })
