import React, { useEffect, useState } from 'react'
import css from './settings.module.scss'
import { useAccountContext } from 'context/account-context'
import Alert from 'lib/components/alert'
import AccountFooter from '../AccountFooter'
import { Button } from 'lib/components/button'
import { InputForm } from 'components/common/input-form'
import { isEmail } from 'utils/validators'
import NotFound from './NotFound'
import { useRouter } from 'next/router'
import { cn } from 'lib/shadcn/lib/utils'
import Tabs from 'components/domain/app/account/tabs'

export default function EmailSettings() {
  const router = useRouter()
  const accountContext = useAccountContext()
  const currentAccount = accountContext.account
  const [email, setEmail] = useState(currentAccount?.email ?? '')
  const [error, setError] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [nonce, setNonce] = useState('')

  useEffect(() => {
    async function UpdateWithToken() {
      const userAccount = await accountContext.loginEmail(email, Number(router.query.token))
      if (userAccount) {
        setEmail(userAccount.email ?? '')
        setError('Email address updated.')
        router.push('/account')
      }
      if (!userAccount) {
        setError('Unable to verify your email address.')
      }
    }

    if (router.query.token) UpdateWithToken()
  }, [router.query.token])

  if (!accountContext.account) {
    return <></>
  }

  const connectEmail = async () => {
    if (!isEmail(email)) {
      setError('Please provide a valid email address.')
      return
    } else {
      setError('')
    }

    setEmailSent(true)
    const token = await accountContext.getToken(email, true)
    if (!token) {
      setEmailSent(false)
      setError('Unable to create verification token')
    }
  }

  const verifyEmail = async () => {
    const nonceNr = Number(nonce)
    if (isNaN(nonceNr)) {
      setError('Please provide a valid verification code.')
      return
    }

    const userAccount = await accountContext.loginEmail(email, nonceNr)
    if (userAccount) {
      router.push('/account')
    }
    if (!userAccount) {
      setError('Unable to verify your email address.')
    }
  }

  const resendVerificationEmail = async () => {
    setEmailSent(true)
    const token = await accountContext.getToken(email, false)
    if (!token) {
      setEmailSent(false)
      setError('Unable to create verification token')
    }
  }

  return (
    <>
      <div data-type="settings-layout" className={cn('flex flex-row lg:gap-3 relative')}>
        <div className={cn('basis-[60%] grow')}>
          <div className="flex flex-col lg:border lg:border-solid lg:border-[#E4E6EB] lg:bg-[#fbfbfb] rounded-3xl relative">
            <div className="flex flex-col gap-3 pb-4 px-4">
              <div className={css['alert']}>
                {error && (
                  <Alert title="Error" color="orange">
                    {error}
                  </Alert>
                )}
              </div>

              <div className={css['form']}>
                <p className={`${css['title']} text-lg font-bold`}>Manage Email</p>

                {!accountContext.account.email && (
                  <div className={css['not-found']}>
                    <NotFound type="email" />
                  </div>
                )}

                {emailSent && (
                  <>
                    <p className={css['content']}>
                      We&apos;ve sent a verification code to your email address. Please enter this code on below.
                    </p>
                    <InputForm
                      className={css['input']}
                      placeholder="Verification code"
                      defaultValue={nonce}
                      onChange={value => setNonce(value)}
                      onSubmit={verifyEmail}
                    />
                    <div className="flex flex-row gap-4 items-center">
                      <Button color="purple-2" fill onClick={verifyEmail}>
                        Verify your email
                      </Button>
                      <span className={`${css['resend']} text-sm`} role="button" onClick={resendVerificationEmail}>
                        Re-send verification code
                      </span>
                    </div>
                  </>
                )}

                {!emailSent && (
                  <>
                    <p className={css['content']}>Add or update the associated email address of your Devcon account.</p>
                    <InputForm
                      className={css['input']}
                      placeholder="Email"
                      defaultValue={email}
                      onChange={value => setEmail(value)}
                      onSubmit={connectEmail}
                    />

                    <div className="flex flex-row gap-4">
                      <Button color="purple-2" fill onClick={connectEmail}>
                        {accountContext.account.email ? 'Update Email' : 'Add Email'}
                      </Button>
                    </div>
                  </>
                )}
              </div>

              <AccountFooter />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
