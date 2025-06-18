import React, { useState, useEffect } from 'react'
import { Button } from 'lib/components/button'
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from 'lib/components/ui/input-otp'
import { Separator } from 'lib/components/ui/separator'
import { useAccountContext } from 'context/account-context'
import { useRouter } from 'next/router'
// import { isEmail } from 'utils/validators'
import Alert from 'lib/components/alert'

const isEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

const TrustModels = (props: any) => {
  const accountContext = useAccountContext()
  const router = useRouter()
  const [emailSent, setEmailSent] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [nonce, setNonce] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    async function LoginWithToken() {
      const userAccount = await accountContext.loginToken(Number(router.query.token))
      if (userAccount && userAccount.onboarded) {
        router.push('/')
      }
      if (userAccount && !userAccount.onboarded) {
        router.push('/onboarding')
      }
      if (!userAccount) {
        setError('Unable to verify your email address.')
      }
    }

    if (router.query.token) LoginWithToken()
  }, [router.query.token, accountContext, router])

  const connectEmail = async () => {
    if (loading) return

    try {
      setLoading(true)
      if (!isEmail(email)) {
        setError('Please provide a valid email address.')
        return
      } else {
        setError('')
      }

      setEmailSent(true)
      const token = await accountContext.getToken(email, false)
      if (!token) {
        setEmailSent(false)
        setError('Unable to create verification token')
      }
    } finally {
      setLoading(false)
    }
  }

  const verifyEmail = async () => {
    if (loading) return
    setLoading(true)

    const nonceNr = Number(nonce)
    if (isNaN(nonceNr)) {
      setError('Please provide a valid verification code.')
      return
    }
    if (nonce.length !== 8) {
      setError('Please provide a valid verification code.')
      return
    }

    try {
      const userAccount = await accountContext.loginEmail(email, nonceNr)
      if (userAccount && userAccount.onboarded) {
        router.push('/')
      }
      if (userAccount && !userAccount.onboarded) {
        router.push('/onboarding')
      }
      if (!userAccount) {
        setError('Unable to verify your email address.')
      }
    } catch (e) {
      setError('Unable to verify your email address.')
    } finally {
      setLoading(false)
    }
  }

  const resendVerificationEmail = async () => {
    if (resendCooldown > 0) return

    try {
      setResendCooldown(30)
      const token = await accountContext.getToken(email, false)
      if (token) {
        setEmailSent(true)
      } else {
        setEmailSent(false)
        setError('Unable to create verification token')
      }
    } finally {
      const interval = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
  }

  return (
    <div>
      {!emailSent && (
        <>
          <div className="flex flex-col gap-2">
            <p className="text-xl">Choose your trust model.</p>
            {error && (
              <p>
                <Alert title="">{error}</Alert>
              </p>
            )}
            <p className="text-sm">
              If this is the first time you're logging in, we will automatically create a new account on your behalf.
            </p>
          </div>

          <div className="mt-6">
            <p className="font-semibold">Email Login</p>
            <div className="relative border border-solid rounded-xl mt-2 overflow-hidden">
              <input
                type="email"
                className="w-full px-3 py-2 border-none"
                placeholder="youremail@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && connectEmail()}
              />
            </div>
            <Button disabled={loading} className="w-full mt-4" onClick={connectEmail}>
              {loading ? 'Sending Email...' : 'Continue With Email'}
            </Button>
          </div>
        </>
      )}

      {emailSent && (
        <div>
          <div className="text-xl">Enter Verification Code</div>
          {error && (
            <p>
              <Alert title="">{error}</Alert>
            </p>
          )}
          <div className="text-sm my-2 mb-4">We've sent a verification code to your email address.</div>
          <InputOTP maxLength={8} value={nonce} onChange={value => setNonce(value)} onSubmit={verifyEmail}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
              <InputOTPSlot index={6} />
              <InputOTPSlot index={7} />
            </InputOTPGroup>
          </InputOTP>
          <Button disabled={loading} className="w-full mt-4" onClick={verifyEmail}>
            {loading ? 'Verifying Email...' : 'Verify Your Email'}
          </Button>
          <Separator className="mt-6 mb-4" />
          <div className="flex flex-row justify-between items-center">
            <div
              className={`text-sm ${resendCooldown > 0 ? 'text-gray-400' : 'cursor-pointer font-semibold'}`}
              onClick={resendVerificationEmail}
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Verification Code'}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const Login = () => {
  const accountContext = useAccountContext()
  //   const router = useRouter()
  const loggedIn = !!accountContext.account

  //   useEffect(() => {
  //     if (loggedIn && accountContext.account?.onboarded) {
  //       router.push('/')
  //     }
  //     if (loggedIn && !accountContext.account?.onboarded) {
  //       router.push('/onboarding')
  //     }
  //   }, [router, loggedIn, accountContext.account])

  if (loggedIn) {
    return null
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl mb-4">Login</h1>
      <TrustModels />
    </div>
  )
}

export default Login
