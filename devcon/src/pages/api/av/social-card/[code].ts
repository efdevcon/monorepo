import type { NextApiRequest, NextApiResponse } from 'next'
import { handleCardRequest } from 'services/av/render'

// Social Card (1200x630, the link-preview size and the card's Figma canvas) for the AV page, with the
// page's hand edits (?title=, ?speakers=CODE,CODE) applied. With ?inputs=<hash> it renders from the stored
// session data into the av-assets bucket and answers the CDN links (services/av/render.ts); without it, the image itself.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await handleCardRequest(req, res, 'Social', 1200, 630)
}
