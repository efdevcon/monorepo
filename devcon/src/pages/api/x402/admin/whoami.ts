/**
 * Resolves the access level of an admin password.
 *
 * The dashboard calls this on login (and on reload, with the stored key) to
 * (a) validate the password before showing the UI and (b) learn whether it is
 * an `admin` or `readonly` session, which decides what it renders. Returns no
 * data of its own, so it is safe to hit with either secret.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { resolveAdminRole, type AdminRole } from 'utils/adminAuth'

type WhoamiResponse = { success: true; role: AdminRole } | { success: false; error: string }

export default function handler(req: NextApiRequest, res: NextApiResponse<WhoamiResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }
  const role = resolveAdminRole(req)
  if (!role) {
    return res.status(401).json({ success: false, error: 'unauthorized' })
  }
  return res.status(200).json({ success: true, role })
}
