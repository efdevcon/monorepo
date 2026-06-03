import { useEffect } from 'react'
import { getSession, signIn } from 'next-auth/react'

// Popup target for GitHub OAuth used by VerifyDiscountModal. On first load it
// kicks off the GitHub sign-in; NextAuth redirects back here with `?done=1`
// after the OAuth round-trip, at which point we wait for the session cookie to
// settle and close the popup. The opener polls getSession() to detect success.
export default function SignIn() {
  useEffect(() => {
    const done = new URLSearchParams(window.location.search).get('done')
    if (done) {
      const timer = setInterval(async () => {
        const session = await getSession()
        if (session?.type === 'github') {
          clearInterval(timer)
          window.close()
        }
      }, 500)
      return () => clearInterval(timer)
    }
    signIn('github', { callbackUrl: '/signin?done=1' })
  }, [])

  return null
}
